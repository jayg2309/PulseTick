import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be at most 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional(),
  isPublic: z.boolean().default(false),
  expiryDuration: z
    .number()
    .min(3600000, 'Minimum expiry is 1 hour') // 1 hour in milliseconds
    .max(2592000000, 'Maximum expiry is 30 days'), // 30 days in milliseconds
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be at most 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional(),
  isPublic: z.boolean().optional(),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be either admin or member' }),
  }),
});

export const banMemberSchema = z.object({
  reason: z
    .string()
    .max(200, 'Ban reason must be at most 200 characters')
    .optional(),
});

export const groupParamsSchema = z.object({
  groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
});

export const memberParamsSchema = z.object({
  groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
});
