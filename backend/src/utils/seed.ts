import bcrypt from 'bcryptjs';
import prisma from '../models/prisma.js';
import { config } from '../config/index.js';

export async function seedAdmin() {
  const existing = await prisma.sysUser.findUnique({
    where: { username: config.admin.username },
  });

  if (!existing) {
    const hashedPassword = await bcrypt.hash(config.admin.password, 10);
    await prisma.sysUser.create({
      data: {
        username: config.admin.username,
        password: hashedPassword,
        realName: '系统管理员',
        email: 'admin@example.com',
        department: '技术部',
        role: 'ADMIN',
        status: 1,
      },
    });
    console.log(`[Seed] Admin user "${config.admin.username}" created. Please change the default password on first login.`);
  }
}
