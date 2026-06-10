import prisma from '../models/prisma.js';

export interface CreateModelInput {
  name: string;
  provider: string;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutSeconds?: number;
  isReviewModel?: number;
}

export interface UpdateModelInput {
  name?: string;
  provider?: string;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutSeconds?: number;
  isReviewModel?: number;
}

export async function listModels() {
  return prisma.sysModel.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      modelName: true,
      baseUrl: true,
      enabled: true,
      timeoutSeconds: true,
      isReviewModel: true,
      createTime: true,
      updateTime: true,
    },
    orderBy: { createTime: 'desc' },
  });
}

async function checkDuplicate(modelName: string, baseUrl: string, excludeId?: number) {
  const where: any = {
    modelName,
    baseUrl: baseUrl || '',
  }
  if (excludeId !== undefined) {
    where.id = { not: excludeId }
  }
  const existing = await prisma.sysModel.findFirst({ where })
  if (existing) {
    throw new Error(`模型标识 "${modelName}" 与 Base URL 的组合已存在`)
  }
}

export async function createModel(input: CreateModelInput) {
  if (!input.baseUrl) throw new Error('Base URL 不能为空');
  if (!input.apiKey) throw new Error('API Key 不能为空');
  await checkDuplicate(input.modelName, input.baseUrl || '')

  return prisma.sysModel.create({
    data: {
      name: input.name,
      provider: input.provider,
      modelName: input.modelName,
      baseUrl: input.baseUrl || '',
      apiKey: input.apiKey || '',
      enabled: 1,
      timeoutSeconds: input.timeoutSeconds ?? 60,
      isReviewModel: input.isReviewModel ?? 0,
    },
    select: {
      id: true,
      name: true,
      provider: true,
      modelName: true,
      baseUrl: true,
      enabled: true,
      timeoutSeconds: true,
      isReviewModel: true,
      createTime: true,
      updateTime: true,
    },
  });
}

export async function updateModel(id: number, input: UpdateModelInput) {
  const existing = await prisma.sysModel.findUnique({ where: { id } });
  if (!existing) throw new Error('模型不存在');

  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.provider !== undefined) data.provider = input.provider;
  if (input.modelName !== undefined) data.modelName = input.modelName;
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
  if (input.apiKey !== undefined) data.apiKey = input.apiKey;
  if (input.timeoutSeconds !== undefined) data.timeoutSeconds = input.timeoutSeconds;
  if (input.isReviewModel !== undefined) data.isReviewModel = input.isReviewModel;

  // Check duplicate if modelName or baseUrl changed
  const newModelName = input.modelName ?? existing.modelName;
  const newBaseUrl = input.baseUrl ?? existing.baseUrl ?? '';
  if (input.modelName !== undefined || input.baseUrl !== undefined) {
    await checkDuplicate(newModelName, newBaseUrl, id);
  }

  return prisma.sysModel.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      provider: true,
      modelName: true,
      baseUrl: true,
      enabled: true,
      timeoutSeconds: true,
      isReviewModel: true,
      createTime: true,
      updateTime: true,
    },
  });
}

export async function deleteModel(id: number) {
  const existing = await prisma.sysModel.findUnique({ where: { id } });
  if (!existing) throw new Error('模型不存在');
  await prisma.sysModel.delete({ where: { id } });
}

export async function toggleModelStatus(id: number) {
  const existing = await prisma.sysModel.findUnique({ where: { id } });
  if (!existing) throw new Error('模型不存在');

  const newStatus = existing.enabled === 1 ? 0 : 1;
  return prisma.sysModel.update({
    where: { id },
    data: { enabled: newStatus },
    select: {
      id: true, name: true, enabled: true, isReviewModel: true,
    },
  });
}

export async function setReviewModel(id: number) {
  const existing = await prisma.sysModel.findUnique({ where: { id } });
  if (!existing) throw new Error('模型不存在');

  // Unset all other review models first
  await prisma.sysModel.updateMany({
    where: { isReviewModel: 1 },
    data: { isReviewModel: 0 },
  });

  return prisma.sysModel.update({
    where: { id },
    data: { isReviewModel: 1 },
    select: {
      id: true, name: true, isReviewModel: true,
    },
  });
}
