import { Response } from 'express';
import { Message, MessageType } from '../models/Message';
import { MessageReaction } from '../models/MessageReaction';
import { GroupMember, MemberRole } from '../models/GroupMember';
import { Group } from '../models/Group';
import { createError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../config/logger';

export class MessageController {
  static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { page = 1, limit = 50, search, before } = req.query;
      const userId = req.user?._id;

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      // Build query
      const query: any = {
        group: groupId,
        deletedAt: { $exists: false },
      };

      // Add search filter
      if (search) {
        query.$text = { $search: search as string };
      }

      // Add pagination filter
      if (before) {
        const beforeMessage = await Message.findById(before);
        if (beforeMessage) {
          query.createdAt = { $lt: beforeMessage.createdAt };
        }
      }

      const skip = (Number(page) - 1) * Number(limit);

      const messages = await Message.find(query)
        .populate('sender', 'username avatarUrl')
        .populate('replyTo', 'content sender type')
        .populate({
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'username',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Get reactions for messages
      const messageIds = messages.map(msg => msg._id);
      const reactions = await MessageReaction.find({
        message: { $in: messageIds },
      }).populate('user', 'username');

      // Group reactions by message
      const reactionsByMessage = reactions.reduce((acc: any, reaction) => {
        const messageId = reaction.message.toString();
        if (!acc[messageId]) {
          acc[messageId] = [];
        }
        acc[messageId].push({
          emoji: reaction.emoji,
          user: {
            id: (reaction.user as any)._id,
            username: (reaction.user as any).username,
          },
          createdAt: reaction.createdAt,
        });
        return acc;
      }, {});

      const formattedMessages = messages.map(message => ({
        id: message._id,
        content: message.content,
        sender: {
          id: (message.sender as any)._id,
          username: (message.sender as any).username,
          avatarUrl: (message.sender as any).avatarUrl,
        },
        type: message.type,
        media: message.media,
        replyTo: message.replyTo ? {
          id: (message.replyTo as any)._id,
          content: (message.replyTo as any).content,
          sender: {
            username: (message.replyTo as any).sender?.username,
          },
          type: (message.replyTo as any).type,
        } : null,
        reactions: reactionsByMessage[message._id.toString()] || [],
        editedAt: message.editedAt,
        createdAt: message.createdAt,
      }));

      res.json({
        messages: formattedMessages.reverse(), // Return in chronological order
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: messages.length === Number(limit),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { content, type = MessageType.TEXT, media, replyTo } = req.body;
      const userId = req.user?._id;

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      // Verify group exists and hasn't expired
      const group = await Group.findById(groupId);
      if (!group || group.expiresAt <= new Date()) {
        throw createError('Group not found or has expired', 404);
      }

      // Validate reply-to message if provided
      if (replyTo) {
        const replyMessage = await Message.findOne({
          _id: replyTo,
          group: groupId,
          deletedAt: { $exists: false },
        });
        if (!replyMessage) {
          throw createError('Reply message not found', 404);
        }
      }

      // Create message
      const message = new Message({
        content,
        sender: userId,
        group: groupId,
        type,
        media,
        replyTo,
      });

      await message.save();
      await message.populate(['sender', 'replyTo']);

      logger.info(`Message sent by ${req.user?.username} to group ${groupId}`);

      res.status(201).json({
        message: 'Message sent successfully',
        data: {
          id: message._id,
          content: message.content,
          sender: {
            id: (message.sender as any)._id,
            username: (message.sender as any).username,
            avatarUrl: (message.sender as any).avatarUrl,
          },
          type: message.type,
          media: message.media,
          replyTo: message.replyTo,
          createdAt: message.createdAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async editMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, messageId } = req.params;
      const { content } = req.body;
      const userId = req.user?._id;

      // Find message
      const message = await Message.findOne({
        _id: messageId,
        group: groupId,
        sender: userId,
        deletedAt: { $exists: false },
      });

      if (!message) {
        throw createError('Message not found or not authorized to edit', 404);
      }

      // Only text messages can be edited
      if (message.type !== MessageType.TEXT) {
        throw createError('Only text messages can be edited', 400);
      }

      // Update message
      message.content = content;
      message.editedAt = new Date();
      await message.save();

      logger.info(`Message edited by ${req.user?.username}: ${messageId}`);

      res.json({
        message: 'Message updated successfully',
        data: {
          id: message._id,
          content: message.content,
          editedAt: message.editedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, messageId } = req.params;
      const userId = req.user?._id;

      // Find message
      const message = await Message.findOne({
        _id: messageId,
        group: groupId,
        deletedAt: { $exists: false },
      });

      if (!message) {
        throw createError('Message not found', 404);
      }

      // Check if user can delete (owner of message or group admin/owner)
      const canDelete = message.sender.toString() === userId;
      
      if (!canDelete) {
        const membership = await GroupMember.findOne({
          user: userId,
          group: groupId,
          role: { $in: [MemberRole.OWNER, MemberRole.ADMIN] },
        });
        
        if (!membership) {
          throw createError('Not authorized to delete this message', 403);
        }
      }

      // Soft delete
      message.deletedAt = new Date();
      await message.save();

      logger.info(`Message deleted by ${req.user?.username}: ${messageId}`);

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      throw error;
    }
  }

  static async addReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user?._id;

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      // Verify message exists
      const message = await Message.findOne({
        _id: messageId,
        group: groupId,
        deletedAt: { $exists: false },
      });

      if (!message) {
        throw createError('Message not found', 404);
      }

      // Check if reaction already exists
      const existingReaction = await MessageReaction.findOne({
        message: messageId,
        user: userId,
        emoji,
      });

      if (existingReaction) {
        throw createError('Reaction already exists', 409);
      }

      // Create reaction
      const reaction = new MessageReaction({
        message: messageId,
        user: userId,
        emoji,
      });

      await reaction.save();
      await reaction.populate('user', 'username');

      res.status(201).json({
        message: 'Reaction added successfully',
        reaction: {
          emoji: reaction.emoji,
          user: {
            id: (reaction.user as any)._id,
            username: (reaction.user as any).username,
          },
          createdAt: reaction.createdAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async removeReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, messageId } = req.params;
      const { emoji } = req.query;
      const userId = req.user?._id;

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      // Find and remove reaction
      const reaction = await MessageReaction.findOneAndDelete({
        message: messageId,
        user: userId,
        emoji,
      });

      if (!reaction) {
        throw createError('Reaction not found', 404);
      }

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      throw error;
    }
  }

  static async searchMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { q: query, page = 1, limit = 20 } = req.query;
      const userId = req.user?._id;

      if (!query) {
        throw createError('Search query is required', 400);
      }

      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const messages = await Message.find({
        group: groupId,
        deletedAt: { $exists: false },
        $text: { $search: query as string },
      })
        .populate('sender', 'username avatarUrl')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const formattedMessages = messages.map(message => ({
        id: message._id,
        content: message.content,
        sender: {
          id: (message.sender as any)._id,
          username: (message.sender as any).username,
          avatarUrl: (message.sender as any).avatarUrl,
        },
        type: message.type,
        createdAt: message.createdAt,
      }));

      res.json({
        messages: formattedMessages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: messages.length === Number(limit),
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
