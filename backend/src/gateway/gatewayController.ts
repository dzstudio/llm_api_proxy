import type { Request, Response } from 'express';
import * as gatewayService from '../gateway/gatewayService.js';

export async function chatCompletions(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        code: 401,
        message: 'Missing or invalid API key. Use: Authorization: Bearer sk_llm_...',
        data: null,
      });
      return;
    }

    const apiKey = authHeader.substring(7);
    const keyRecord = await gatewayService.authenticateApiKey(apiKey);

    if (!keyRecord) {
      res.status(401).json({
        code: 401,
        message: 'Invalid or disabled API key',
        data: null,
      });
      return;
    }

    const { model: requestedModel, messages, stream } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        code: 400,
        message: 'messages array is required',
        data: null,
      });
      return;
    }

    const resolvedModel = await gatewayService.resolveModel(requestedModel, keyRecord.defaultModelId);
    if (!resolvedModel) {
      res.status(400).json({
        code: 400,
        message: 'No enabled model found',
        data: null,
      });
      return;
    }

    const response = await gatewayService.forwardToProvider(resolvedModel, req.body);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `Provider error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.message || parsed.message || errorMsg;
      } catch { /* use default msg */ }

      res.status(502).json({ code: 502, message: errorMsg, data: null });
      return;
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.startsWith('data: [DONE]')) {
              try {
                const json = JSON.parse(line.substring(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch { /* skip unparseable lines */ }
            }
          }

          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
      }

      res.end();

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
      const assistantContent = data.choices?.[0]?.message?.content || '';

      gatewayService.logConversation(
        keyRecord.userId,
        resolvedModel.id,
        req.body.session_id,
        messages,
        assistantContent,
        data.usage || null,
      ).catch(err => console.error('[Gateway] Failed to log conversation:', err));

      res.json(data);
    }
  } catch (err: any) {
    if (err.message === 'Request timeout') {
      res.status(504).json({ code: 504, message: 'Gateway request timeout', data: null });
    } else {
      console.error('[Gateway] Error:', err);
      res.status(500).json({ code: 500, message: err.message || 'Internal gateway error', data: null });
    }
  }
}
