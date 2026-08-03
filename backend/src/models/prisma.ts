import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 启用 SQLite WAL 模式和 busy_timeout 以提升并发性能
async function optimizeSQLite() {
  try {
    // 使用 $queryRawUnsafe 执行所有 PRAGMA（它们都可能返回结果）
    const walResult = await prisma.$queryRawUnsafe<Array<{ journal_mode: string }>>('PRAGMA journal_mode=WAL;');
    console.log(`[SQLite] Journal mode set to: ${walResult[0]?.journal_mode || 'unknown'}`);

    await prisma.$queryRawUnsafe<Array<{ busy_timeout: number }>>('PRAGMA busy_timeout=5000;');
    await prisma.$queryRawUnsafe<Array<{ synchronous: string }>>('PRAGMA synchronous=NORMAL;');
    console.log('[SQLite] WAL mode enabled, busy_timeout=5000ms, synchronous=NORMAL');
  } catch (err) {
    console.error('[SQLite] Failed to set WAL mode:', err);
  }
}

// 启动时立即执行
optimizeSQLite();

export default prisma;
