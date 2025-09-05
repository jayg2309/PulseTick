import { Request, Response } from 'express';
import { User } from '../models/User';
import { JwtService } from '../utils/jwt';
import { createError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../config/logger';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        throw createError(`User with this ${field} already exists`, 409);
      }

      // Create new user
      const user = new User({
        email,
        username,
        passwordHash: password, // Will be hashed by pre-save middleware
      });

      await user.save();

      // Generate tokens
      const tokens = JwtService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      });

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        ...tokens,
      });
    } catch (error) {
      throw error;
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw createError('Invalid email or password', 401);
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw createError('Invalid email or password', 401);
      }

      // Update user status
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      // Generate tokens
      const tokens = JwtService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      });

      logger.info(`User logged in: ${user.email}`);

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
        ...tokens,
      });
    } catch (error) {
      throw error;
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = JwtService.verifyRefreshToken(refreshToken);

      // Check if user still exists
      const user = await User.findById(payload.userId);
      if (!user) {
        throw createError('User not found', 404);
      }

      // Generate new tokens
      const tokens = JwtService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      });

      res.json({
        message: 'Token refreshed successfully',
        ...tokens,
      });
    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        
        logger.info(`User logged out: ${req.user?.email}`);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      throw error;
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user?._id).select('-passwordHash');
      
      if (!user) {
        throw createError('User not found', 404);
      }

      res.json({
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const updates = req.body;

      // Check if username is being updated and if it's already taken
      if (updates.username) {
        const existingUser = await User.findOne({
          username: updates.username,
          _id: { $ne: userId },
        });
        
        if (existingUser) {
          throw createError('Username already taken', 409);
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-passwordHash');

      if (!user) {
        throw createError('User not found', 404);
      }

      logger.info(`User profile updated: ${user.email}`);

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw createError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 400);
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      throw error;
    }
  }
}
