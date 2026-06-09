import type { Request, Response } from 'express';
import * as apiKeyService from '../services/apiKeyService.js';

export async function list(req: Request, res: Response) {
  try {
    const { userId, role } = req as any;
    const result = await apiKeyService.listApiKeys(userId, role);
    res.json({ code: 0, message: 'success', data: { list: result } });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const { userId } = req as any;
    const result = await apiKeyService.createApiKey(userId);
    res.json({ code: 0, message: '创建成功', data: result });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function reset(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    const { userId, role } = req as any;
    const result = await apiKeyService.resetApiKey(id, userId, role);
    res.json({ code: 0, message: '重置成功', data: result });
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
    const { userId, role } = req as any;
    const result = await apiKeyService.toggleApiKeyStatus(id, userId, role);
    res.json({ code: 0, message: '操作成功', data: result });
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
    const { userId, role } = req as any;
    await apiKeyService.deleteApiKey(id, userId, role);
    res.json({ code: 0, message: '删除成功', data: null });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}
