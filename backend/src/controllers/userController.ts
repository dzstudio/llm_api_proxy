import type { Request, Response } from 'express';
import { createUserSchema, updateUserSchema, userQuerySchema } from '../validators/user.js';
import * as userService from '../services/userService.js';

export async function list(req: Request, res: Response) {
  try {
    const parsed = userQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    const result = await userService.listUsers(parsed.data);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: parsed.error.errors[0]?.message || '参数错误',
        data: null,
      });
      return;
    }
    const user = await userService.createUser(parsed.data);
    res.json({ code: 0, message: '创建成功', data: user });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: parsed.error.errors[0]?.message || '参数错误',
        data: null,
      });
      return;
    }
    const user = await userService.updateUser(id, parsed.data);
    res.json({ code: 0, message: '更新成功', data: user });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    await userService.deleteUser(id);
    res.json({ code: 0, message: '删除成功', data: null });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function toggleStatus(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    const user = await userService.toggleUserStatus(id);
    res.json({ code: 0, message: '操作成功', data: user });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}
