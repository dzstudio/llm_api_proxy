import cron from 'node-cron';
import prisma from '../models/prisma.js';

function getYesterdayRange() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const reportDate = new Date(yesterday);
  reportDate.setHours(0, 0, 0, 0);

  return { start: yesterday, end: yesterdayEnd, reportDate };
}

async function generateReportForUser(userId: number, start: Date, end: Date, reportDate: Date) {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      createTime: { gte: start, lte: end },
    },
  });

  if (conversations.length === 0) return null;

  const promptCount = conversations.reduce((sum, c) => sum + c.messageCount, 0);
  const tokenCount = conversations.reduce((sum, c) => sum + c.tokenCount, 0);

  const modelIds = [...new Set(conversations.map(c => c.modelId).filter(Boolean))] as number[];
  const models = modelIds.length > 0
    ? await prisma.sysModel.findMany({ where: { id: { in: modelIds } }, select: { name: true } })
    : [];
  const modelNames = models.map(m => m.name).join('、') || '-';

  const summary = `昨日共发起 ${conversations.length} 次对话，累计 ${promptCount} 条消息，消耗 ${tokenCount} tokens。使用模型：${modelNames}`;

  return prisma.dailyReport.create({
    data: {
      userId,
      reportDate,
      summary,
      promptCount,
      tokenCount,
    },
  });
}

export async function runDailyReport() {
  console.log('[Scheduler] Running daily report generation...');

  try {
    const { start, end, reportDate } = getYesterdayRange();

    const activeUsers = await prisma.sysUser.findMany({
      where: { status: 1 },
      select: { id: true },
    });

    let generated = 0;
    for (const user of activeUsers) {
      const result = await generateReportForUser(user.id, start, end, reportDate);
      if (result) generated++;
    }

    console.log(`[Scheduler] Daily reports generated: ${generated} users`);
  } catch (err) {
    console.error('[Scheduler] Failed to generate daily reports:', err);
  }
}

export function startScheduler() {
  // Run at 00:05 every day
  cron.schedule('5 0 * * *', () => {
    runDailyReport();
  });

  console.log('[Scheduler] Daily report cron scheduled at 00:05');
}
