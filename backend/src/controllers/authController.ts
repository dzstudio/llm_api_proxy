import type { Request, Response } from 'express';
import { loginSchema } from '../validators/auth.js';
import * as authService from '../services/authService.js';

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: parsed.error.errors[0]?.message || '参数错误',
        data: null,
      });
      return;
    }

    const result = await authService.login(parsed.data);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err: any) {
    res.status(401).json({ code: 401, message: err.message || '登录失败', data: null });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null });
      return;
    }
    const user = await authService.getCurrentUser(userId);
    res.json({ code: 0, message: 'success', data: user });
  } catch (err: any) {
    res.status(401).json({ code: 401, message: err.message || '获取用户信息失败', data: null });
  }
}
