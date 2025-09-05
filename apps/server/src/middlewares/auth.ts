import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../utils/jwt';
import { User } from '../models/User';
import { logger } from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { _id: string };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JwtService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const payload = JwtService.verifyAccessToken(token);
    
    // Verify user still exists
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      ...payload,
      _id: payload.userId,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JwtService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = JwtService.verifyAccessToken(token);
      const user = await User.findById(payload.userId).select('-passwordHash');
      
      if (user) {
        req.user = {
          ...payload,
          _id: payload.userId,
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
