import crypto from 'crypto';
import prisma from '../models/prisma.js';

function hashApiKey(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

function generatePlainKey(): string {
  const random = crypto.randomBytes(24).toString('hex');
  return `sk_llm_${random}`;
}

export async function listApiKeys(userId: number, role: string) {
  const where = role === 'ADMIN' ? {} : { userId };
  const list = await prisma.sysApiKey.findMany({
    where,
    select: {
      id: true,
      userId: true,
      apiKey: true,
      defaultModelId: true,
      status: true,
      createTime: true,
      updateTime: true,
    },
    orderBy: { createTime: 'desc' },
  });

  // Get usernames for display
  const userIds = [...new Set(list.map(k => k.userId))];
  const users = await prisma.sysUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.username]));

  return list.map(key => ({
    id: key.id,
    userId: key.userId,
    username: userMap.get(key.userId) || '-',
    apiKey: maskKey(key.apiKey),
    defaultModelId: key.defaultModelId,
    status: key.status,
    createTime: key.createTime,
    updateTime: key.updateTime,
  }));
}

export async function createApiKey(userId: number) {
  const plainKey = generatePlainKey();
  const hashed = hashApiKey(plainKey);

  const record = await prisma.sysApiKey.create({
    data: {
      userId,
      apiKey: hashed,
      status: 1,
    },
  });

  return {
    id: record.id,
    userId: record.userId,
    apiKey: plainKey,
    status: record.status,
    createTime: record.createTime,
  };
}

export async function resetApiKey(id: number, userId: number, role: string) {
  const existing = await prisma.sysApiKey.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('API Key 不存在');
  }
  if (role !== 'ADMIN' && existing.userId !== userId) {
    throw new Error('无权操作');
  }

  const plainKey = generatePlainKey();
  const hashed = hashApiKey(plainKey);

  const updated = await prisma.sysApiKey.update({
    where: { id },
    data: { apiKey: hashed, updateTime: new Date() },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    apiKey: plainKey,
    status: updated.status,
    updateTime: updated.updateTime,
  };
}

export async function toggleApiKeyStatus(id: number, userId: number, role: string) {
  const existing = await prisma.sysApiKey.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('API Key 不存在');
  }
  if (role !== 'ADMIN' && existing.userId !== userId) {
    throw new Error('无权操作');
  }

  const newStatus = existing.status === 1 ? 0 : 1;
  return prisma.sysApiKey.update({
    where: { id },
    data: { status: newStatus },
    select: { id: true, userId: true, status: true },
  });
}

export async function deleteApiKey(id: number, userId: number, role: string) {
  const existing = await prisma.sysApiKey.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('API Key 不存在');
  }
  if (role !== 'ADMIN' && existing.userId !== userId) {
    throw new Error('无权操作');
  }

  await prisma.sysApiKey.delete({ where: { id } });
}

function maskKey(hashed: string): string {
  if (!hashed || hashed.length < 12) return '****';
  return `${hashed.substring(0, 8)}...${hashed.substring(hashed.length - 8)}`;
}
