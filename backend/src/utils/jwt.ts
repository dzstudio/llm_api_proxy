import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function generateToken(payload: { userId: number; username: string; role: string }): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiration } as jwt.SignOptions);
}

export function verifyToken(token: string): { userId: number; username: string; role: string } | null {
  try {
    return jwt.verify(token, config.jwt.secret) as { userId: number; username: string; role: string };
  } catch {
    return null;
  }
}
