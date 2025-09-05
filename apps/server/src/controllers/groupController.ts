import { Response } from 'express';
import { Group } from '../models/Group';
import { GroupMember, MemberRole } from '../models/GroupMember';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { createError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../config/logger';

export class GroupController {
  static async createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, description, isPublic, expiryDuration } = req.body;
      const userId = req.user?._id;

      const expiresAt = new Date(Date.now() + expiryDuration);

      // Create group
      const group = new Group({
        name,
        description,
        isPublic,
        expiresAt,
        createdBy: userId,
      });

      await group.save();

      // Add creator as owner
      const membership = new GroupMember({
        user: userId,
        group: group._id,
        role: MemberRole.OWNER,
      });

      await membership.save();

      logger.info(`Group created: ${name} by ${req.user?.username}`);

      res.status(201).json({
        message: 'Group created successfully',
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          isPublic: group.isPublic,
          inviteCode: group.inviteCode,
          expiresAt: group.expiresAt,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async getGroups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Get user's group memberships
      const memberships = await GroupMember.find({
        user: userId,
        role: { $ne: MemberRole.BANNED },
      })
        .populate({
          path: 'group',
          match: { expiresAt: { $gt: new Date() } }, // Only non-expired groups
          populate: {
            path: 'createdBy',
            select: 'username avatarUrl',
          },
        })
        .skip(skip)
        .limit(Number(limit))
        .sort({ joinedAt: -1 });

      const groups = memberships
        .filter(membership => membership.group) // Filter out null groups (expired)
        .map(membership => ({
          id: (membership.group as any)._id,
          name: (membership.group as any).name,
          description: (membership.group as any).description,
          isPublic: (membership.group as any).isPublic,
          inviteCode: membership.role === MemberRole.OWNER ? (membership.group as any).inviteCode : undefined,
          expiresAt: (membership.group as any).expiresAt,
          createdBy: (membership.group as any).createdBy,
          createdAt: (membership.group as any).createdAt,
          role: membership.role,
          joinedAt: membership.joinedAt,
        }));

      res.json({
        groups,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: groups.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async getGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      // Check if user is a member
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!membership) {
        throw createError('Group not found or access denied', 404);
      }

      const group = await Group.findById(groupId)
        .populate('createdBy', 'username avatarUrl');

      if (!group || group.expiresAt <= new Date()) {
        throw createError('Group not found or has expired', 404);
      }

      // Get member count
      const memberCount = await GroupMember.countDocuments({
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      res.json({
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          isPublic: group.isPublic,
          inviteCode: membership.role === MemberRole.OWNER ? group.inviteCode : undefined,
          expiresAt: group.expiresAt,
          createdBy: group.createdBy,
          createdAt: group.createdAt,
          memberCount,
          userRole: membership.role,
          joinedAt: membership.joinedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;
      const updates = req.body;

      // Check if user is owner or admin
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $in: [MemberRole.OWNER, MemberRole.ADMIN] },
      });

      if (!membership) {
        throw createError('Not authorized to update this group', 403);
      }

      const group = await Group.findByIdAndUpdate(
        groupId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('createdBy', 'username avatarUrl');

      if (!group) {
        throw createError('Group not found', 404);
      }

      logger.info(`Group updated: ${group.name} by ${req.user?.username}`);

      res.json({
        message: 'Group updated successfully',
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          isPublic: group.isPublic,
          expiresAt: group.expiresAt,
          createdBy: group.createdBy,
          updatedAt: group.updatedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      // Only owner can delete group
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: MemberRole.OWNER,
      });

      if (!membership) {
        throw createError('Not authorized to delete this group', 403);
      }

      const group = await Group.findById(groupId);
      if (!group) {
        throw createError('Group not found', 404);
      }

      // Delete group (this will trigger TTL cleanup)
      await Group.findByIdAndDelete(groupId);

      // Clean up related data
      await GroupMember.deleteMany({ group: groupId });
      await Message.deleteMany({ group: groupId });

      logger.info(`Group deleted: ${group.name} by ${req.user?.username}`);

      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      throw error;
    }
  }

  static async joinGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inviteCode } = req.body;
      const userId = req.user?._id;

      // Find group by invite code
      const group = await Group.findOne({ inviteCode });
      if (!group || group.expiresAt <= new Date()) {
        throw createError('Invalid invite code or group has expired', 404);
      }

      // Check if user is already a member
      const existingMembership = await GroupMember.findOne({
        user: userId,
        group: group._id,
      });

      if (existingMembership) {
        if (existingMembership.role === MemberRole.BANNED) {
          throw createError('You are banned from this group', 403);
        }
        throw createError('You are already a member of this group', 409);
      }

      // Add user as member
      const membership = new GroupMember({
        user: userId,
        group: group._id,
        role: MemberRole.MEMBER,
      });

      await membership.save();

      logger.info(`User ${req.user?.username} joined group ${group.name}`);

      res.json({
        message: 'Successfully joined group',
        group: {
          id: group._id,
          name: group.name,
          description: group.description,
          expiresAt: group.expiresAt,
          role: membership.role,
          joinedAt: membership.joinedAt,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async leaveGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
      });

      if (!membership || membership.role === MemberRole.BANNED) {
        throw createError('You are not a member of this group', 404);
      }

      if (membership.role === MemberRole.OWNER) {
        throw createError('Group owner cannot leave. Transfer ownership or delete the group.', 400);
      }

      await GroupMember.findByIdAndDelete(membership._id);

      logger.info(`User ${req.user?.username} left group ${groupId}`);

      res.json({ message: 'Successfully left group' });
    } catch (error) {
      throw error;
    }
  }

  static async getMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;
      const { page = 1, limit = 50 } = req.query;

      // Check if user is a member
      const userMembership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      });

      if (!userMembership) {
        throw createError('Group not found or access denied', 404);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const members = await GroupMember.find({
        group: groupId,
        role: { $ne: MemberRole.BANNED },
      })
        .populate('user', 'username avatarUrl isOnline lastSeen')
        .skip(skip)
        .limit(Number(limit))
        .sort({ joinedAt: 1 });

      const memberList = members.map(member => ({
        id: (member.user as any)._id,
        username: (member.user as any).username,
        avatarUrl: (member.user as any).avatarUrl,
        isOnline: (member.user as any).isOnline,
        lastSeen: (member.user as any).lastSeen,
        role: member.role,
        joinedAt: member.joinedAt,
      }));

      res.json({
        members: memberList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: memberList.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const userId = req.user?._id;

      // Check if user is owner or admin
      const userMembership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $in: [MemberRole.OWNER, MemberRole.ADMIN] },
      });

      if (!userMembership) {
        throw createError('Not authorized to update member roles', 403);
      }

      // Find target member
      const targetMembership = await GroupMember.findOne({
        user: targetUserId,
        group: groupId,
      });

      if (!targetMembership) {
        throw createError('Member not found', 404);
      }

      // Owners cannot be demoted by admins
      if (targetMembership.role === MemberRole.OWNER && userMembership.role !== MemberRole.OWNER) {
        throw createError('Cannot modify owner role', 403);
      }

      // Update role
      targetMembership.role = role;
      await targetMembership.save();

      logger.info(`Member role updated in group ${groupId}: ${targetUserId} -> ${role}`);

      res.json({ message: 'Member role updated successfully' });
    } catch (error) {
      throw error;
    }
  }

  static async banMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId, userId: targetUserId } = req.params;
      const { reason } = req.body;
      const userId = req.user?._id;

      // Check if user is owner or admin
      const userMembership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $in: [MemberRole.OWNER, MemberRole.ADMIN] },
      });

      if (!userMembership) {
        throw createError('Not authorized to ban members', 403);
      }

      // Find target member
      const targetMembership = await GroupMember.findOne({
        user: targetUserId,
        group: groupId,
      });

      if (!targetMembership) {
        throw createError('Member not found', 404);
      }

      // Cannot ban owner
      if (targetMembership.role === MemberRole.OWNER) {
        throw createError('Cannot ban group owner', 403);
      }

      // Update membership to banned
      targetMembership.role = MemberRole.BANNED;
      targetMembership.bannedAt = new Date();
      targetMembership.bannedBy = userId;
      targetMembership.banReason = reason;
      await targetMembership.save();

      logger.info(`Member banned from group ${groupId}: ${targetUserId} by ${userId}`);

      res.json({ message: 'Member banned successfully' });
    } catch (error) {
      throw error;
    }
  }

  static async generateNewInviteCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;

      // Check if user is owner or admin
      const membership = await GroupMember.findOne({
        user: userId,
        group: groupId,
        role: { $in: [MemberRole.OWNER, MemberRole.ADMIN] },
      });

      if (!membership) {
        throw createError('Not authorized to generate invite codes', 403);
      }

      const group = await Group.findById(groupId);
      if (!group) {
        throw createError('Group not found', 404);
      }

      // Generate new invite code
      const newInviteCode = (group as any).generateNewInviteCode();
      await group.save();

      logger.info(`New invite code generated for group ${group.name}`);

      res.json({
        message: 'New invite code generated',
        inviteCode: newInviteCode,
      });
    } catch (error) {
      throw error;
    }
  }
}
