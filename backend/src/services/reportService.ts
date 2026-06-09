import prisma from '../models/prisma.js';

interface ListQuery {
  userId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const USER_SELECT = { id: true, username: true, realName: true };

export async function listReports(query: ListQuery) {
  const { userId, startDate, endDate } = query;
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));

  const where: any = {};

  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.reportDate = {};
    if (startDate) where.reportDate.gte = new Date(startDate);
    if (endDate) where.reportDate.lte = new Date(endDate + 'T23:59:59.999Z');
  }

  const [list, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      include: {
        user: { select: USER_SELECT },
      },
      orderBy: { reportDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dailyReport.count({ where }),
  ]);

  return {
    list: list.map(r => ({
      id: r.id,
      userId: r.userId,
      username: r.user.realName || r.user.username,
      reportDate: r.reportDate,
      summary: r.summary,
      promptCount: r.promptCount,
      tokenCount: r.tokenCount,
      score: r.score,
      createTime: r.createTime,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getReportDetail(id: number) {
  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      user: { select: USER_SELECT },
    },
  });

  if (!report) return null;

  return {
    id: report.id,
    userId: report.userId,
    username: report.user.realName || report.user.username,
    reportDate: report.reportDate,
    summary: report.summary,
    promptCount: report.promptCount,
    tokenCount: report.tokenCount,
    score: report.score,
    reviewContent: report.reviewContent,
    createTime: report.createTime,
  };
}

export async function getReportStats() {
  const [totalReports, aggregation] = await Promise.all([
    prisma.dailyReport.count(),
    prisma.dailyReport.aggregate({
      _sum: { promptCount: true, tokenCount: true },
    }),
  ]);

  // Per-user aggregation
  const userStats = await prisma.dailyReport.groupBy({
    by: ['userId'],
    _count: { id: true },
    _sum: { promptCount: true, tokenCount: true },
    orderBy: { _sum: { tokenCount: 'desc' } },
    take: 10,
  });

  const userIds = userStats.map(u => u.userId);
  const users = await prisma.sysUser.findMany({
    where: { id: { in: userIds } },
    select: USER_SELECT,
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  return {
    totalReports,
    totalPrompts: aggregation._sum.promptCount || 0,
    totalTokens: aggregation._sum.tokenCount || 0,
    topUsers: userStats.map(u => ({
      userId: u.userId,
      username: userMap.get(u.userId)?.realName || userMap.get(u.userId)?.username || '-',
      reportCount: u._count.id,
      totalPrompts: u._sum.promptCount || 0,
      totalTokens: u._sum.tokenCount || 0,
    })),
  };
}
