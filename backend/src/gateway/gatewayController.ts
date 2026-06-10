import type { Request, Response } from 'express';
import * as gatewayService from '../gateway/gatewayService.js';

export async function chatCompletions(req: Request, res: Response) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[Gateway:${requestId}] >>> Incoming request`);
  try {
    // Support both Anthropic standard (x-api-key) and OpenAI standard (Authorization: Bearer)
    let apiKey: string;
    if (req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'] as string;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      apiKey = req.headers.authorization.substring(7);
    } else {
      console.log(`[Gateway:${requestId}] FAIL: Missing API key (x-api-key or Authorization: Bearer)`);
      res.status(401).json({
        code: 401,
        message: 'Missing API key. Use x-api-key or Authorization: Bearer header',
        data: null,
      });
      return;
    }
    console.log(`[Gateway:${requestId}] API Key prefix: ${apiKey.substring(0, 14)}...`);
    const keyRecord = await gatewayService.authenticateApiKey(apiKey);

    if (!keyRecord) {
      console.log(`[Gateway:${requestId}] FAIL: Invalid or disabled API key`);
      res.status(401).json({
        code: 401,
        message: 'Invalid or disabled API key',
        data: null,
      });
      return;
    }
    console.log(`[Gateway:${requestId}] Auth OK - user=${keyRecord.user.username}(id=${keyRecord.userId}), keyId=${keyRecord.id}`);

    const { model: requestedModel, messages, stream } = req.body;
    console.log(`[Gateway:${requestId}] Body: model="${requestedModel}", stream=${stream}, messages.length=${messages?.length}, keys=[${Object.keys(req.body).join(',')}]`);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log(`[Gateway:${requestId}] FAIL: messages array is empty or missing`);
      res.status(400).json({
        code: 400,
        message: 'messages array is required',
        data: null,
      });
      return;
    }

    console.log(`[Gateway:${requestId}] Resolving model: requested="${requestedModel}" defaultModelId=${keyRecord.defaultModelId}`);
    const resolvedModel = await gatewayService.resolveModel(requestedModel, keyRecord.defaultModelId);
    if (!resolvedModel) {
      console.log(`[Gateway:${requestId}] FAIL: No enabled model found`);
      res.status(400).json({
        code: 400,
        message: 'No enabled model found',
        data: null,
      });
      return;
    }
    console.log(`[Gateway:${requestId}] Resolved model: id=${resolvedModel.id} name="${resolvedModel.name}" modelName="${resolvedModel.modelName}" baseUrl="${resolvedModel.baseUrl}"`);

    const response = await gatewayService.forwardToProvider(resolvedModel, req.body);
    console.log(`[Gateway:${requestId}] Provider response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`[Gateway:${requestId}] Provider ERROR body: ${errorBody.substring(0, 500)}`);
      let errorMsg = `Provider error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.message || parsed.message || errorMsg;
      } catch { /* use default msg */ }

      console.log(`[Gateway:${requestId}] FAIL: ${response.status} - ${errorMsg}`);
      res.status(502).json({ code: 502, message: errorMsg, data: null });
      return;
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (!response.body) {
        res.status(502).json({ code: 502, message: 'Upstream response body is empty', data: null });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      req.on('close', () => {
        if (!res.writableEnded) {
          reader.cancel().catch(() => {});
        }
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            // OpenAI format: data: {"choices":[{"delta":{"content":"..."}}]}
            if (line.startsWith('data: ') && !line.startsWith('data: [DONE]')) {
              try {
                const json = JSON.parse(line.substring(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* skip */ }
            }
            // Anthropic format: data: {"type":"content_block_delta","delta":{"text":"..."}}
            if (line.startsWith('data: ') && line.includes('"type":"content_block_delta"')) {
              try {
                const json = JSON.parse(line.substring(6));
                const text = json.delta?.text;
                if (text) fullContent += text;
              } catch { /* skip */ }
            }
          }

          if (!res.writableEnded) {
            res.write(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!res.writableEnded) {
        res.end();
      }

      gatewayService.logConversation(
        keyRecord.userId,
        resolvedModel.id,
        req.body.session_id,
        messages,
        fullContent,
        null,
      ).catch(err => console.error('[Gateway] Failed to log conversation:', err));
    } else {
      const data = await response.json() as any;
      // Extract assistant content from either OpenAI or Anthropic format
      const contentArray = data.content as any[] | undefined;
      // Anthropic format: content is an array, find the text block (skip thinking blocks)
      const anthropicTextBlock = contentArray?.find?.((b: any) => b.type === 'text');
      // Fallback: use thinking content if no text block (edge case: all tokens consumed by thinking)
      const anthropicThinkingBlock = !anthropicTextBlock
        ? contentArray?.find?.((b: any) => b.type === 'thinking')
        : null;
      const assistantContent =
        data.choices?.[0]?.message?.content ||    // OpenAI format
        anthropicTextBlock?.text ||                // Anthropic format: text block
        anthropicThinkingBlock?.thinking ||         // Anthropic format: thinking block fallback
        '';

      console.log(`[Gateway:${requestId}] Content extraction: hasChoices=${!!data.choices}, contentBlocks=${contentArray?.length || 0}, blockTypes=[${contentArray?.map((b: any) => b.type).join(',') || ''}], assistantContentLen=${assistantContent.length}`);

      const usage = data.usage || null;

      gatewayService.logConversation(
        keyRecord.userId,
        resolvedModel.id,
        req.body.session_id,
        messages,
        assistantContent,
        usage,
      ).catch(err => console.error('[Gateway] Failed to log conversation:', err));

      res.json(data);
    }
  } catch (err: any) {
    console.log(`[Gateway:${requestId}] EXCEPTION: name="${err.name}" message="${err.message}"`);
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.log(`[Gateway:${requestId}] FAIL: 504 Timeout`);
      res.status(504).json({ code: 504, message: 'Gateway request timeout', data: null });
    } else {
      console.error(`[Gateway:${requestId}] FAIL: 500 -`, err);
      res.status(500).json({ code: 500, message: err.message || 'Internal gateway error', data: null });
    }
  }
}
