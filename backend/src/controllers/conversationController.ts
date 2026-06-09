import type { Request, Response } from 'express';
import * as conversationService from '../services/conversationService.js';

export async function list(req: Request, res: Response) {
  try {
    const { userId, modelId, keyword, startDate, endDate, page, pageSize } = req.query;

    const parsedUserId = userId ? parseInt(String(userId)) : undefined;
    const parsedModelId = modelId ? parseInt(String(modelId)) : undefined;
    const parsedPage = page ? parseInt(String(page)) : undefined;
    const parsedPageSize = pageSize ? parseInt(String(pageSize)) : undefined;

    if (parsedUserId !== undefined && isNaN(parsedUserId)) {
      res.status(400).json({ code: 400, message: '参数错误：userId 格式不正确', data: null });
      return;
    }
    if (parsedModelId !== undefined && isNaN(parsedModelId)) {
      res.status(400).json({ code: 400, message: '参数错误：modelId 格式不正确', data: null });
      return;
    }

    const result = await conversationService.listConversations({
      userId: parsedUserId,
      modelId: parsedModelId,
      keyword: keyword ? String(keyword) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      page: parsedPage,
      pageSize: parsedPageSize,
    });

    res.json({ code: 0, message: 'success', data: result });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function detail(req: Request, res: Response) {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }

    const data = await conversationService.getConversationDetail(id);
    if (!data) {
      res.status(404).json({ code: 404, message: '会话不存在', data: null });
      return;
    }

    res.json({ code: 0, message: 'success', data });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function stats(_req: Request, res: Response) {
  try {
    const data = await conversationService.getConversationStats();
    res.json({ code: 0, message: 'success', data });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}
