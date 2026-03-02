import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';

export interface TokenPayload {
  userId: string;
  globalRole: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' }); 
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' }); 
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
};