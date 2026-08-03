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

  // Auto-split long sessions into 30-minute time windows to avoid one giant
  // conversation accumulating hundreds of messages and causing SQLite write pressure.
  const WINDOW_MS = 30 * 60 * 1000;
  let conversation;
  if (sessionId) {
    conversation = await prisma.conversation.findFirst({
      where: { sessionId, userId },
      orderBy: { updateTime: 'desc' },
    });

    if (conversation) {
      const age = Date.now() - new Date(conversation.updateTime).getTime();
      if (age > WINDOW_MS) {
        const windowKey = Math.floor(Date.now() / WINDOW_MS);
        const timedSessionId = `${sessionId}-w${windowKey}`;
        console.log(`[Gateway:logConversation] Time window: ${timedSessionId}`);
        conversation = await prisma.conversation.findFirst({
          where: { sessionId: timedSessionId, userId },
          orderBy: { updateTime: 'desc' },
        });
        if (!conversation) {
          sessionId = timedSessionId;
        }
      }
    }
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

  // Dedup: fetch recent existing user messages to avoid re-logging duplicates.
  // Optimized: only fetch last 50 messages (reduced from 200) for dedup check
  const existingContents = new Set(
    conversation.id
      ? (await prisma.message.findMany({
          where: { conversationId: conversation.id, role: 'user' },
          select: { content: true },
          orderBy: { id: 'desc' },
          take: 50,
        })).map((m: { content: string | null }) => m.content)
      : [],
  );

  // Only process the last 20 user messages per batch.
  // Claude Code sends full history, but only the newest messages need logging.
  const MAX_BATCH = 20;
  const messagesToProcess = userMessages.slice(-MAX_BATCH);

  // Prepare batch insert data for user messages
  const newUserMessages: { conversationId: number; role: string; content: string; tokens: number }[] = [];
  for (const msg of messagesToProcess) {
    const rawText = extractTextContent(msg.content);
    if (!rawText) continue;
    const cleaned = cleanUserPrompt(rawText);
    if (!cleaned || existingContents.has(cleaned)) continue;
    if (cleaned.length > 2000) continue;
    existingContents.add(cleaned);
    newUserMessages.push({
      conversationId: conversation.id,
      role: 'user',
      content: cleaned,
      tokens: estimateTokens(cleaned),
    });
  }

  // Prepare assistant message data
  const assistantMessage = assistantContent ? {
    conversationId: conversation.id,
    role: 'assistant',
    content: assistantContent.length > 8192 ? assistantContent.slice(0, 8192) + '…[已截取]' : assistantContent,
    tokens: completionTokens,
    promptTokens: usage?.prompt_tokens || null,
  } : null;

  const loggedMsgCount = newUserMessages.length + (assistantMessage ? 1 : 0);

  if (loggedMsgCount === 0) {
    await prisma.conversation.delete({ where: { id: conversation.id } }).catch(() => {});
    return;
  }

  // Use transaction for batch insert - much faster than individual inserts
  await prisma.$transaction(async (tx) => {
    // Batch insert user messages
    if (newUserMessages.length > 0) {
      await tx.message.createMany({
        data: newUserMessages,
      });
    }

    // Insert assistant message
    if (assistantMessage) {
      await tx.message.create({
        data: assistantMessage as any,
      });
    }

    // Update conversation counters
    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        tokenCount: conversation.tokenCount + totalTokens,
        messageCount: conversation.messageCount + loggedMsgCount,
        title: conversation.title || title,
      },
    });
  });
}
