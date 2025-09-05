import { Socket } from 'socket.io';
import { JwtService } from '../utils/jwt';
import { User } from '../models/User';
import { logger } from '../config/logger';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const payload = JwtService.verifyAccessToken(token);
    
    // Verify user exists
    const user = await User.findById(payload.userId).select('-passwordHash');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user info to socket
    socket.userId = payload.userId;
    socket.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    // Update user online status
    await User.findByIdAndUpdate(payload.userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    logger.info(`Socket authenticated for user: ${user.email}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};
