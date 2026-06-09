import crypto from 'crypto';
import prisma from '../models/prisma.js';

function hashApiKey(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function authenticateApiKey(plainKey: string) {
  const hashed = hashApiKey(plainKey);
  const apiKey = await prisma.sysApiKey.findUnique({
    where: { apiKey: hashed },
    include: { user: true },
  });

  if (!apiKey || apiKey.status !== 1 || apiKey.user.status !== 1) {
    return null;
  }

  return apiKey;
}

export async function resolveModel(requestedModel?: string, defaultModelId?: number | null) {
  if (requestedModel) {
    const model = await prisma.sysModel.findFirst({
      where: { modelName: requestedModel, enabled: 1 },
    });
    if (model) return model;
  }

  if (defaultModelId) {
    const model = await prisma.sysModel.findFirst({
      where: { id: defaultModelId, enabled: 1 },
    });
    if (model) return model;
  }

  return prisma.sysModel.findFirst({ where: { enabled: 1 } });
}

export async function forwardToProvider(model: any, body: any) {
  const baseUrl = model.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/v1/chat/completions`;

  const { model: _reqModel, messages, stream, temperature, max_tokens, session_id, ...rest } = body;

  const forwardBody: Record<string, unknown> = {
    model: model.modelName,
    messages,
    ...rest,
  };

  if (temperature !== undefined) forwardBody.temperature = temperature;
  if (max_tokens !== undefined) forwardBody.max_tokens = max_tokens;
  if (stream !== undefined) forwardBody.stream = stream;

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

export async function logConversation(
  userId: number,
  modelId: number,
  sessionId: string | undefined,
  messages: { role: string; content: string }[],
  assistantContent: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
) {
  const promptTokens = usage?.prompt_tokens
    || messages.reduce((sum, m) => sum + estimateTokens(m.content || ''), 0);
  const completionTokens = usage?.completion_tokens || estimateTokens(assistantContent);
  const totalTokens = usage?.total_tokens || (promptTokens + completionTokens);

  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = (firstUserMsg?.content || 'New Conversation').slice(0, 100);

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

  for (const msg of messages) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: msg.role,
        content: msg.content || '',
        tokens: estimateTokens(msg.content || ''),
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantContent,
      tokens: completionTokens,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      tokenCount: conversation.tokenCount + totalTokens,
      messageCount: conversation.messageCount + messages.length + 1,
      title: conversation.title || title,
    },
  });
}
