import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(50),
  password: z.string().min(6, '密码至少6个字符').max(100),
  realName: z.string().min(1, '姓名不能为空').max(100).optional().default(''),
  email: z.string().email('邮箱格式不正确').max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().default(''),
  role: z.enum(['ADMIN', 'USER']).optional().default('USER'),
});

export const updateUserSchema = z.object({
  realName: z.string().min(1, '姓名不能为空').max(100).optional(),
  email: z.string().email('邮箱格式不正确').max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  status: z.number().int().min(0).max(1).optional(),
  password: z.string().min(6, '密码至少6个字符').max(100).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  keyword: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
