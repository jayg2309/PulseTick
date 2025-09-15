import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './socketAuth';
import { GroupMember, MemberRole } from '../models/GroupMember';
import { Message, MessageType } from '../models/Message';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { logger } from '../config/logger';

export class SocketHandlers {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  handleConnection = (socket: AuthenticatedSocket): void => {
    const userId = socket.userId!;
    const username = socket.user!.username;

    // Store connection
    this.connectedUsers.set(userId, socket.id);
    
    logger.info(`User connected: ${username} (${socket.id})`);

    // Join user to their groups
    this.joinUserGroups(socket, userId);

    // Handle joining a group room
    socket.on('join-group', async (groupId: string) => {
      await this.handleJoinGroup(socket, groupId);
    });

    // Handle leaving a group room
    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      logger.info(`User ${username} left group ${groupId}`);
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Handle typing indicators
    socket.on('typing-start', (groupId: string) => {
      socket.to(`group:${groupId}`).emit('user-typing', {
        userId,
        username,
        isTyping: true,
      });
    });

    socket.on('typing-stop', (groupId: string) => {
      socket.to(`group:${groupId}`).emit('user-typing', {
        userId,
        username,
        isTyping: false,
      });
    });

    // Handle message reactions
    socket.on('add-reaction', async (data) => {
      await this.handleAddReaction(socket, data);
    });

    socket.on('remove-reaction', async (data) => {
      await this.handleRemoveReaction(socket, data);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket, userId, username);
    });
  };

  private async joinUserGroups(socket: AuthenticatedSocket, userId: string): Promise<void> {
    try {
      const memberships = await GroupMember.find({
        user: userId,
        role: { $ne: MemberRole.BANNED },
      }).populate('group');

      for (const membership of memberships) {
        const group = membership.group as any;
        if (group && new Date(group.expiresAt) > new Date()) {
          socket.join(`group:${group._id}`);
          logger.info(`User ${socket.user!.username} joined group ${group.name}`);
        }
      }
    } catch (error) {
      logger.error('Error joining user groups:', error);
    }
  }

  private async handleJoinGroup(socket: AuthenticatedSocket, groupId: string): Promise<void> {
    try {
      const userId = socket.userId!;
      
      // Check if user is a member of the group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        socket.emit('error', { message: 'Not authorized to join this group' });
        return;
      }

      // Check if group still exists and hasn't expired
      const group = await Group.findById(groupId);
      if (!group || new Date(group.expiresAt) <= new Date()) {
        socket.emit('error', { message: 'Group not found or has expired' });
        return;
      }

      socket.join(`group:${groupId}`);
      
      // Notify other members
      socket.to(`group:${groupId}`).emit('user-joined', {
        userId,
        username: socket.user!.username,
      });

      logger.info(`User ${socket.user!.username} joined group ${group.name}`);
    } catch (error) {
      logger.error('Error handling join group:', error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { groupId, content, type = MessageType.TEXT, media, replyTo } = data;
      const userId = socket.userId!;

      // Validate group membership
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        socket.emit('error', { message: 'Not authorized to send messages to this group' });
        return;
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

      // Emit to all group members
      this.io.to(`group:${groupId}`).emit('new-message', {
        _id: message._id,
        content: message.content,
        sender: {
          _id: message.sender._id,
          username: (message.sender as any).username,
          avatarUrl: (message.sender as any).avatarUrl,
        },
        group: message.group,
        type: message.type,
        media: message.media,
        replyTo: message.replyTo,
        createdAt: message.createdAt,
      });

      logger.info(`Message sent by ${socket.user!.username} to group ${groupId}`);
    } catch (error) {
      logger.error('Error handling send message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private async handleAddReaction(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { messageId, emoji } = data;
      const userId = socket.userId!;

      // Find the message and verify access
      const message = await Message.findById(messageId).populate('group');
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check group membership
      const membership = await GroupMember.findOne({
        user: userId,
        group: message.group,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      // Add reaction logic would go here (MessageReaction model)
      // For now, just emit the reaction
      this.io.to(`group:${message.group}`).emit('reaction-added', {
        messageId,
        userId,
        username: socket.user!.username,
        emoji,
      });

    } catch (error) {
      logger.error('Error handling add reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  private async handleRemoveReaction(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { messageId, emoji } = data;
      const userId = socket.userId!;

      // Similar logic to add reaction but for removal
      this.io.to(`group:${data.groupId}`).emit('reaction-removed', {
        messageId,
        userId,
        emoji,
      });

    } catch (error) {
      logger.error('Error handling remove reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  private async handleDisconnect(socket: AuthenticatedSocket, userId: string, username: string): Promise<void> {
    try {
      // Remove from connected users
      this.connectedUsers.delete(userId);

      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Notify all groups the user was in
      const memberships = await GroupMember.find({
        user: userId,
        role: { $ne: MemberRole.BANNED },
      });

      for (const membership of memberships) {
        socket.to(`group:${membership.group}`).emit('user-left', {
          userId,
          username,
        });
      }

      logger.info(`User disconnected: ${username} (${socket.id})`);
    } catch (error) {
      logger.error('Error handling disconnect:', error);
    }
  }

  // Utility method to get online users in a group
  async getOnlineUsersInGroup(groupId: string): Promise<string[]> {
    const sockets = await this.io.in(`group:${groupId}`).fetchSockets();
    return sockets
      .map(socket => (socket as unknown as AuthenticatedSocket).userId)
      .filter((userId): userId is string => userId !== undefined);
  }
}
