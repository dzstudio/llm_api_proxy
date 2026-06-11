import prisma from '../models/prisma.js';
import crypto from 'crypto';

function simpleHash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 12);
}

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

// Extract plain text from content that may be a string or an array of content blocks.
// Skips tool_result blocks (they carry file contents / source code, not user prompts).
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

// Claude Code wraps system-injected content in these XML tags.
// We strip them so only real user-entered prompts remain.
const SYSTEM_TAGS = [
  'system-reminder',
  'command-name',
  'command-message',
  'command-args',
  'user-prompt-submit-hook',
  'task-notification',
  'local-command-caveat',
  'local-command-stdout',
  'bash-input',
  'bash-stdout',
  'bash-stderr',
];

function cleanUserPrompt(content: string): string {
  let result = content;
  for (const tag of SYSTEM_TAGS) {
    // Fully enclosed tags: <tag>...</tag>, <tag attr="...">...</tag>, <tag />
    result = result.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'g'), '');
    // Self-closing form: <tag />
    result = result.replace(new RegExp(`<${tag}[^>]*\/>`, 'g'), '');
  }
  // Unclosed <system-reminder> that runs to end of string
  result = result.replace(/<system-reminder>[\s\S]*$/g, '');
  return result.trim();
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

  // If no session_id provided (Claude Code doesn't send one), auto-generate
  // from first user message — same conversation thread always has same first msg
  if (!sessionId && userMessages.length > 0) {
    sessionId = `auto-${userId}-${simpleHash(firstClean)}`;
    console.log(`[Gateway:logConversation] Auto-generated sessionId: ${sessionId}`);
  }

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

  // Dedup: fetch existing user message contents to avoid re-logging duplicates
  // (Claude Code re-sends full conversation history on every request)
  const existingContents = new Set(
    conversation.id
      ? (await prisma.message.findMany({
          where: { conversationId: conversation.id, role: 'user' },
          select: { content: true },
        })).map((m: { content: string | null }) => m.content)
      : [],
  );

  // Only log cleaned user messages (skip system/tool/assistant messages from provider request)
  let newUserMsgCount = 0;
  for (const msg of userMessages) {
    const rawText = extractTextContent(msg.content);
    // Skip tool_result messages (they carry file contents / source code)
    if (!rawText) continue;
    const cleaned = cleanUserPrompt(rawText);
    if (!cleaned || existingContents.has(cleaned)) continue;
    // Safety net: skip messages that are clearly tool output / source code
    // (unusually long content that wasn't caught by tag stripping)
    if (cleaned.length > 2000) continue;
    newUserMsgCount++;
    existingContents.add(cleaned); // Track in-memory to avoid dupes within same batch
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

  const loggedMsgCount = newUserMsgCount + (assistantContent ? 1 : 0);

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
