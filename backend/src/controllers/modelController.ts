import type { Request, Response } from 'express';
import * as modelService from '../services/modelService.js';

export async function list(_req: Request, res: Response) {
  try {
    const list = await modelService.listModels();
    res.json({ code: 0, message: 'success', data: { list } });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const model = await modelService.createModel(req.body);
    res.json({ code: 0, message: '创建成功', data: model });
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
    const model = await modelService.updateModel(id, req.body);
    res.json({ code: 0, message: '更新成功', data: model });
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
    await modelService.deleteModel(id);
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
    const model = await modelService.toggleModelStatus(id);
    res.json({ code: 0, message: '操作成功', data: model });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function setReview(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }
    const model = await modelService.setReviewModel(id);
    res.json({ code: 0, message: '已设为评价模型', data: model });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}
