import prisma from '../models/prisma.js';
import { calculateCost } from '../config/pricing.js';

// 简单的内存缓存，用于 Dashboard 统计数据
interface StatsCache {
  data: any;
  timestamp: number;
}

let statsCache: StatsCache | null = null;
const STATS_CACHE_TTL = 30 * 1000; // 30秒缓存

interface ListQuery {
  userId?: number;
  modelId?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const USER_SELECT = { id: true, username: true, realName: true };
const MODEL_SELECT = { id: true, name: true, modelName: true, provider: true };

export async function listConversations(query: ListQuery) {
  const { userId, modelId, keyword, startDate, endDate } = query;
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));

  const where: any = {};

  if (userId) where.userId = userId;
  if (modelId) where.modelId = modelId;

  if (startDate || endDate) {
    where.createTime = {};
    if (startDate) where.createTime.gte = new Date(startDate);
    if (endDate) where.createTime.lte = new Date(endDate + 'T23:59:59.999Z');
  }

  if (keyword) {
    where.title = { contains: keyword };
  }

  const [list, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        user: { select: USER_SELECT },
        model: { select: MODEL_SELECT },
      },
      orderBy: { createTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    list: list.map(c => ({
      id: c.id,
      userId: c.userId,
      username: c.user.realName || c.user.username,
      modelId: c.modelId,
      modelName: c.model?.name || '-',
      title: c.title,
      tokenCount: c.tokenCount,
      messageCount: c.messageCount,
      createTime: c.createTime,
      updateTime: c.updateTime,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getConversationDetail(id: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      user: { select: USER_SELECT },
      model: { select: MODEL_SELECT },
      messages: {
        orderBy: { createTime: 'asc' },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    userId: conversation.userId,
    username: conversation.user.realName || conversation.user.username,
    modelId: conversation.modelId,
    modelName: conversation.model?.name || '-',
    provider: conversation.model?.provider || '-',
    title: conversation.title,
    sessionId: conversation.sessionId,
    tokenCount: conversation.tokenCount,
    messageCount: conversation.messageCount,
    cost: conversation.cost,
    createTime: conversation.createTime,
    updateTime: conversation.updateTime,
    messages: conversation.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      tokens: m.tokens,
      createTime: m.createTime,
    })),
  };
}

export async function getConversationStats() {
  // 检查缓存是否有效
  if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
    console.log('[Stats] Returning cached stats');
    return statsCache.data;
  }

  console.log('[Stats] Cache miss, fetching fresh data');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalConversations, totalTokens, totalMessages,
    todayConversations, todayTokensAgg, monthTokensAgg, activeUsersToday,
    yesterdayConversations, yesterdayTokensAgg,
    topUsers, modelUsage,
    recentRecords,
    todayCostConvs,
    yesterdayCostConvs,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.aggregate({ _sum: { tokenCount: true } }),
    prisma.conversation.aggregate({ _sum: { messageCount: true } }),
    prisma.conversation.count({ where: { createTime: { gte: todayStart, lt: todayEnd } } }),
    prisma.conversation.aggregate({
      where: { createTime: { gte: todayStart, lt: todayEnd } },
      _sum: { tokenCount: true },
    }),
    prisma.conversation.aggregate({
      where: { createTime: { gte: monthStart, lt: todayEnd } },
      _sum: { tokenCount: true },
    }),
    prisma.conversation.groupBy({
      by: ['userId'],
      where: { createTime: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.conversation.count({ where: { createTime: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.conversation.aggregate({
      where: { createTime: { gte: yesterdayStart, lt: todayStart } },
      _sum: { tokenCount: true },
    }),
    prisma.conversation.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { tokenCount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.conversation.groupBy({
      by: ['modelId'],
      _count: { id: true },
      _sum: { tokenCount: true },
    }),
    prisma.conversation.findMany({
      orderBy: { createTime: 'desc' },
      take: 5,
      include: {
        user: { select: USER_SELECT },
        model: { select: MODEL_SELECT },
      },
    }),
    // Fetch conversations for today's cost calculation — find conversations that
    // have messages today, and only count today's messages. Assistant messages
    // carry real API prompt_tokens + completion_tokens (via tokens field).
    prisma.conversation.findMany({
      where: {
        modelId: { not: null },
        messages: { some: { createTime: { gte: todayStart, lt: todayEnd } } },
      },
      select: {
        model: { select: { modelName: true } },
        messages: {
          where: { createTime: { gte: todayStart, lt: todayEnd } },
          select: { role: true, tokens: true, promptTokens: true },
        },
      },
    }),
    // Fetch conversations for yesterday's cost calculation
    prisma.conversation.findMany({
      where: {
        modelId: { not: null },
        messages: { some: { createTime: { gte: yesterdayStart, lt: todayStart } } },
      },
      select: {
        model: { select: { modelName: true } },
        messages: {
          where: { createTime: { gte: yesterdayStart, lt: todayStart } },
          select: { role: true, tokens: true, promptTokens: true },
        },
      },
    }),
  ]);

  const userIds = topUsers.map(u => u.userId);
  const users = await prisma.sysUser.findMany({
    where: { id: { in: userIds } },
    select: USER_SELECT,
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const modelIds = modelUsage.filter(m => m.modelId).map(m => m.modelId!);
  const models = await prisma.sysModel.findMany({
    where: { id: { in: modelIds } },
    select: MODEL_SELECT,
  });
  const modelMap = new Map(models.map(m => [m.id, m]));

  const todayCost = computeDailyCost(todayCostConvs);
  const yesterdayCost = computeDailyCost(yesterdayCostConvs);

  const statsResult = {
    totalConversations,
    totalTokens: totalTokens._sum.tokenCount || 0,
    totalMessages: totalMessages._sum.messageCount || 0,
    todayConversations,
    todayTokens: todayTokensAgg._sum.tokenCount || 0,
    yesterdayConversations,
    yesterdayTokens: yesterdayTokensAgg._sum.tokenCount || 0,
    todayCost,
    yesterdayCost,
    monthTokens: monthTokensAgg._sum.tokenCount || 0,
    activeUsersToday: activeUsersToday.length,
    topUsers: topUsers.map(u => ({
      userId: u.userId,
      username: userMap.get(u.userId)?.realName || userMap.get(u.userId)?.username || '-',
      conversationCount: u._count.id,
      tokenCount: u._sum.tokenCount || 0,
    })),
    modelUsage: modelUsage.filter(m => m.modelId).map(m => ({
      modelId: m.modelId,
      modelName: modelMap.get(m.modelId!)?.name || '-',
      conversationCount: m._count.id,
      tokenCount: m._sum.tokenCount || 0,
    })),
    recentRecords: recentRecords.map(c => ({
      id: c.id,
      username: c.user.realName || c.user.username,
      modelName: c.model?.name || '-',
      title: c.title,
      tokenCount: c.tokenCount,
      messageCount: c.messageCount,
      createTime: c.createTime,
    })),
  };

  // 更新缓存
  statsCache = {
    data: statsResult,
    timestamp: Date.now(),
  };
  console.log('[Stats] Cache updated');

  return statsResult;
}

// Compute daily cost from messages created on the target day.
// Assistant messages carry real API prompt_tokens and completion_tokens (tokens).
// User message tokens are estimates (text.length/4) — only used as prompt fallback.
function computeDailyCost(
  conversations: {
    model: { modelName: string } | null;
    messages: { role: string; tokens: number; promptTokens: number | null }[];
  }[],
): number {
  const modelTokens: Record<string, { prompt: number; completion: number }> = {};

  for (const conv of conversations) {
    const modelName = conv.model?.modelName;
    if (!modelName) continue;

    let promptSum = 0;
    let completionSum = 0;
    for (const msg of conv.messages) {
      if (msg.role === 'assistant') {
        completionSum += msg.tokens; // real API completion_tokens
        if (msg.promptTokens) {
          promptSum += msg.promptTokens; // real API prompt_tokens
        }
      } else if (msg.role === 'user') {
        // User messages as prompt fallback (estimated tokens, typically small)
        promptSum += msg.tokens;
      }
    }

    if (!modelTokens[modelName]) {
      modelTokens[modelName] = { prompt: 0, completion: 0 };
    }
    modelTokens[modelName].prompt += promptSum;
    modelTokens[modelName].completion += completionSum;
  }

  let totalCost = 0;
  const costDetails: string[] = [];
  for (const [modelName, tokens] of Object.entries(modelTokens)) {
    const cost = calculateCost(modelName, tokens.prompt, tokens.completion);
    totalCost += cost;
    costDetails.push(`${modelName}: prompt=${tokens.prompt} comp=${tokens.completion} cost=¥${cost.toFixed(2)}`);
  }
  if (costDetails.length > 0) {
    console.log(`[CostCalc] ${new Date().toISOString().slice(0, 10)} ${costDetails.join(' | ')} total=¥${totalCost.toFixed(2)}`);
  }
  return Math.round(totalCost * 100) / 100;
}
