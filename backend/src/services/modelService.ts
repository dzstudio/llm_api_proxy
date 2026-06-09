import prisma from '../models/prisma.js';

export interface CreateModelInput {
  name: string;
  provider: string;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  isReviewModel?: number;
}

export interface UpdateModelInput {
  name?: string;
  provider?: string;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutSeconds?: number;
  isReviewModel?: number;
}

export async function listModels() {
  return prisma.sysModel.findMany({
    orderBy: { createTime: 'desc' },
  });
}

export async function createModel(input: CreateModelInput) {
  return prisma.sysModel.create({
    data: {
      name: input.name,
      provider: input.provider,
      modelName: input.modelName,
      baseUrl: input.baseUrl || '',
      apiKey: input.apiKey || '',
      enabled: 0,
      maxTokens: input.maxTokens || 4096,
      temperature: input.temperature || 0.7,
      timeoutSeconds: input.timeoutSeconds || 60,
      isReviewModel: input.isReviewModel || 0,
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
  if (input.maxTokens !== undefined) data.maxTokens = input.maxTokens;
  if (input.temperature !== undefined) data.temperature = input.temperature;
  if (input.timeoutSeconds !== undefined) data.timeoutSeconds = input.timeoutSeconds;
  if (input.isReviewModel !== undefined) data.isReviewModel = input.isReviewModel;

  return prisma.sysModel.update({ where: { id }, data });
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
  });
}
