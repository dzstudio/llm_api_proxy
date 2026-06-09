import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/llm',
];

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some((path) => req.path.startsWith(path))) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未提供认证令牌', data: null });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ code: 401, message: '认证令牌无效或已过期', data: null });
    return;
  }

  (req as any).userId = payload.userId;
  (req as any).username = payload.username;
  (req as any).role = payload.role;

  next();
}

export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).role;
  if (role !== 'ADMIN') {
    res.status(403).json({ code: 403, message: '无权限，仅管理员可操作', data: null });
    return;
  }
  next();
}
