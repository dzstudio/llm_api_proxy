import prisma from '../models/prisma.js';

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function authenticateApiKey(plainKey: string) {
  const apiKey = await prisma.sysApiKey.findUnique({
    where: { apiKey: plainKey },
    include: { user: true },
  });

  if (!apiKey || apiKey.status !== 1 || apiKey.user.status !== 1) {
    return null;
  }

  return apiKey;
}

export async function resolveModel(requestedModel?: string, defaultModelId?: number | null) {
  if (requestedModel) {
    console.log(`[Gateway:resolveModel] Looking up by modelName="${requestedModel}"`);
    const model = await prisma.sysModel.findFirst({
      where: { modelName: requestedModel, enabled: 1 },
    });
    if (model) {
      console.log(`[Gateway:resolveModel] Found by modelName: id=${model.id} name="${model.name}" baseUrl="${model.baseUrl}"`);
      return model;
    }
    console.log(`[Gateway:resolveModel] Not found by modelName="${requestedModel}"`);
  }

  if (defaultModelId) {
    console.log(`[Gateway:resolveModel] Looking up by defaultModelId=${defaultModelId}`);
    const model = await prisma.sysModel.findFirst({
      where: { id: defaultModelId, enabled: 1 },
    });
    if (model) {
      console.log(`[Gateway:resolveModel] Found by defaultModelId: id=${model.id} name="${model.name}"`);
      return model;
    }
    console.log(`[Gateway:resolveModel] Not found by defaultModelId=${defaultModelId}`);
  }

  console.log(`[Gateway:resolveModel] Fallback: looking for any enabled model`);
  const fallback = await prisma.sysModel.findFirst({ where: { enabled: 1 } });
  if (fallback) {
    console.log(`[Gateway:resolveModel] Fallback found: id=${fallback.id} name="${fallback.name}"`);
  } else {
    console.log(`[Gateway:resolveModel] No enabled models in database!`);
  }
  return fallback;
}

export async function forwardToProvider(model: any, body: any) {
  const baseUrl = (model.baseUrl || '').replace(/\/$/, '');
  const isAnthropic = baseUrl.endsWith('/anthropic');

  const url = isAnthropic
    ? `${baseUrl}/v1/messages`
    : `${baseUrl}/v1/chat/completions`;

  console.log(`[Gateway:forwardToProvider] Provider: ${isAnthropic ? 'Anthropic' : 'OpenAI'} endpoint, URL: ${url}`);
  console.log(`[Gateway:forwardToProvider] Using modelName="${model.modelName}", hasApiKey=${!!model.apiKey}, timeout=${model.timeoutSeconds || 60}s`);

  let forwardBody: Record<string, unknown>;

  if (isAnthropic) {
    // Anthropic format: forward request body, but override model with resolved model name
    const { session_id, ...rest } = body;
    forwardBody = { ...rest, model: model.modelName };
  } else {
    // OpenAI format: build from parts
    const { model: _reqModel, messages, stream, temperature, max_tokens, session_id, ...rest } = body;
    forwardBody = {
      model: model.modelName,
      messages,
      ...rest,
    };
    if (temperature !== undefined) forwardBody.temperature = temperature;
    if (max_tokens !== undefined) forwardBody.max_tokens = max_tokens;
    if (stream !== undefined) forwardBody.stream = stream;
  }

  const timeoutMs = (model.timeoutSeconds || 60) * 1000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify(forwardBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Extract plain text from content that may be a string or an array of content blocks
function extractTextContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text' && b.text)
      .map((b: any) => b.text)
      .join('\n');
  }
  return String(content || '');
}

function cleanUserPrompt(content: string): string {
  return content
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, '')
    .replace(/<system-reminder>[\s\S]*$/g, '')
    .trim();
}

export async function logConversation(
  userId: number,
  modelId: number,
  sessionId: string | undefined,
  messages: { role: string; content: string }[],
  assistantContent: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
) {
  // Only record actual user-entered prompts (role=user), skip system/tool messages
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0 && !assistantContent) return;

  const promptTokens = usage?.prompt_tokens
    || userMessages.reduce((sum, m) => sum + estimateTokens(m.content || ''), 0);
  const completionTokens = usage?.completion_tokens || estimateTokens(assistantContent);
  const totalTokens = usage?.total_tokens || (promptTokens + completionTokens);

  const firstClean = cleanUserPrompt(extractTextContent(userMessages[0]?.content));
  const title = firstClean.slice(0, 100) || 'New Conversation';

  let conversation;
  if (sessionId) {
    conversation = await prisma.conversation.findFirst({
      where: { sessionId, userId },
    });
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId,
        modelId,
        sessionId: sessionId || null,
        title,
        tokenCount: 0,
        messageCount: 0,
      },
    });
  }

  // Only log cleaned user messages (skip system/tool/assistant messages from provider request)
  for (const msg of userMessages) {
    const cleaned = cleanUserPrompt(extractTextContent(msg.content));
    if (!cleaned) continue;
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: cleaned,
        tokens: estimateTokens(cleaned),
      },
    });
  }

  // Log assistant response
  if (assistantContent) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent.length > 8192 ? assistantContent.slice(0, 8192) + '…[已截取]' : assistantContent,
        tokens: completionTokens,
      },
    });
  }

  const loggedMsgCount = userMessages.filter(m => cleanUserPrompt(extractTextContent(m.content))).length + (assistantContent ? 1 : 0);

  // If nothing was actually logged (all user messages filtered out, no assistant content), remove empty conversation
  if (loggedMsgCount === 0) {
    await prisma.conversation.delete({ where: { id: conversation.id } }).catch(() => {});
    return;
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      tokenCount: conversation.tokenCount + totalTokens,
      messageCount: conversation.messageCount + loggedMsgCount,
      title: conversation.title || title,
    },
  });
}
