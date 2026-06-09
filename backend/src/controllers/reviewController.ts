import type { Request, Response } from 'express';
import * as reviewService from '../services/reviewService.js';

export async function evaluate(req: Request, res: Response) {
  try {
    const conversationId = parseInt(String(req.params.conversationId));
    if (isNaN(conversationId)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }

    const result = await reviewService.evaluateConversation(conversationId);
    res.json({ code: 0, message: '评价完成', data: result });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message, data: null });
  }
}

export async function getByConversation(req: Request, res: Response) {
  try {
    const conversationId = parseInt(String(req.params.conversationId));
    if (isNaN(conversationId)) {
      res.status(400).json({ code: 400, message: '参数错误', data: null });
      return;
    }

    const data = await reviewService.getReviewByConversation(conversationId);
    if (!data) {
      res.json({ code: 0, message: 'success', data: null });
      return;
    }

    res.json({ code: 0, message: 'success', data });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function list(_req: Request, res: Response) {
  try {
    const page = parseInt(String(_req.query.page || '1'));
    const pageSize = parseInt(String(_req.query.pageSize || '20'));

    const result = await reviewService.listReviews(page, pageSize);
    res.json({ code: 0, message: 'success', data: result });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}
