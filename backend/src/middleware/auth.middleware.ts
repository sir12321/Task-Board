import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthRequest } from '../controllers/auth.controller';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies.accessToken;

  if (!token) {
    res.status(401).json({ error: 'Access token missing' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.userId,
      globalRole: decoded.globalRole,
    };
    next();
  } catch {
    res.status(403).json({ error: 'Token expired or invalid' });
  }
};
