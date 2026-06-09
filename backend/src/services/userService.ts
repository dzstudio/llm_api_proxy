import bcrypt from 'bcryptjs';
import prisma from '../models/prisma.js';
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '../validators/user.js';
import { Prisma } from '@prisma/client';

export async function listUsers(query: UserQueryInput) {
  const { page, pageSize, keyword } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.SysUserWhereInput = {};
  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { realName: { contains: keyword } },
      { email: { contains: keyword } },
      { department: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.sysUser.findMany({
      where,
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        department: true,
        role: true,
        status: true,
        lastLoginTime: true,
        createTime: true,
      },
      skip,
      take: pageSize,
      orderBy: { createTime: 'desc' },
    }),
    prisma.sysUser.count({ where }),
  ]);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.sysUser.findUnique({
    where: { username: input.username },
  });
  if (existing) {
    throw new Error('用户名已存在');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  return prisma.sysUser.create({
    data: {
      username: input.username,
      password: hashedPassword,
      realName: input.realName || '',
      email: input.email || '',
      department: input.department || '',
      role: input.role || 'USER',
      status: 1,
    },
    select: {
      id: true,
      username: true,
      realName: true,
      email: true,
      department: true,
      role: true,
      status: true,
      createTime: true,
    },
  });
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const user = await prisma.sysUser.findUnique({ where: { id } });
  if (!user) {
    throw new Error('用户不存在');
  }

  const data: any = {};
  if (input.realName !== undefined) data.realName = input.realName;
  if (input.email !== undefined) data.email = input.email;
  if (input.department !== undefined) data.department = input.department;
  if (input.role !== undefined) data.role = input.role;
  if (input.status !== undefined) data.status = input.status;
  if (input.password) {
    data.password = await bcrypt.hash(input.password, 10);
  }

  return prisma.sysUser.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      realName: true,
      email: true,
      department: true,
      role: true,
      status: true,
      createTime: true,
      updateTime: true,
    },
  });
}

export async function deleteUser(id: number) {
  const user = await prisma.sysUser.findUnique({ where: { id } });
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.username === 'admin') {
    throw new Error('不能删除管理员账号');
  }

  // Delete related records
  await prisma.$transaction([
    prisma.sysApiKey.deleteMany({ where: { userId: id } }),
    prisma.dailyReport.deleteMany({ where: { userId: id } }),
    prisma.sysUser.delete({ where: { id } }),
  ]);
}

export async function toggleUserStatus(id: number) {
  const user = await prisma.sysUser.findUnique({ where: { id } });
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.username === 'admin') {
    throw new Error('不能禁用管理员账号');
  }

  const newStatus = user.status === 1 ? 0 : 1;
  return prisma.sysUser.update({
    where: { id },
    data: { status: newStatus },
    select: {
      id: true,
      username: true,
      realName: true,
      status: true,
    },
  });
}
