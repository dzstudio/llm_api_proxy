import type { Request, Response } from 'express';
import * as reportService from '../services/reportService.js';

export async function list(req: Request, res: Response) {
  try {
    const { userId, startDate, endDate, page, pageSize } = req.query;

    const result = await reportService.listReports({
      userId: userId ? parseInt(String(userId)) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      page: page ? parseInt(String(page)) : undefined,
      pageSize: pageSize ? parseInt(String(pageSize)) : undefined,
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

    const data = await reportService.getReportDetail(id);
    if (!data) {
      res.status(404).json({ code: 404, message: '日报不存在', data: null });
      return;
    }

    res.json({ code: 0, message: 'success', data });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}

export async function stats(_req: Request, res: Response) {
  try {
    const data = await reportService.getReportStats();
    res.json({ code: 0, message: 'success', data });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
}
