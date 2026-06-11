import bcrypt from 'bcryptjs';
import prisma from '../models/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { config } from '../config/index.js';
import type { LoginInput } from '../validators/auth.js';

export async function login(input: LoginInput) {
  const user = await prisma.sysUser.findUnique({
    where: { username: input.username },
  });

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  if (user.status === 0) {
    throw new Error('账号已被禁用');
  }

  const passwordValid = await bcrypt.compare(input.password, user.password);
  if (!passwordValid) {
    throw new Error('用户名或密码错误');
  }

  // Check if this is the default admin password (first login)
  const requirePasswordChange =
    user.username === config.admin.username &&
    (await bcrypt.compare(config.admin.password, user.password));

  // Update last login time
  await prisma.sysUser.update({
    where: { id: user.id },
    data: { lastLoginTime: new Date() },
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    id: user.id,
    token,
    username: user.username,
    realName: user.realName || '',
    role: user.role,
    requirePasswordChange,
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.sysUser.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error('当前密码不正确');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.sysUser.update({
    where: { id: userId },
    data: { password: hashed },
  });
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.sysUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      realName: true,
      email: true,
      department: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    id: user.id,
    username: user.username,
    realName: user.realName || '',
    email: user.email || '',
    department: user.department || '',
    role: user.role,
    status: user.status,
  };
}
