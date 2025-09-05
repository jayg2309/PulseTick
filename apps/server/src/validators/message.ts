import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .max(2000, 'Message content must be at most 2000 characters')
    .optional(),
  type: z.enum(['text', 'image', 'video', 'file']).default('text'),
  media: z.object({
    publicId: z.string(),
    secureUrl: z.string().url(),
    resourceType: z.string(),
    bytes: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    format: z.string().optional(),
  }).optional(),
  replyTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID').optional(),
}).refine(
  (data) => data.content || data.media,
  { message: 'Either content or media must be provided' }
);

export const getMessagesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  search: z.string().optional(),
  before: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(), // Message ID for pagination
});

export const messageParamsSchema = z.object({
  groupId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid group ID'),
  messageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID'),
});

export const editMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(2000, 'Message content must be at most 2000 characters'),
});

export const addReactionSchema = z.object({
  emoji: z
    .string()
    .min(1, 'Emoji is required')
    .max(10, 'Emoji must be at most 10 characters'),
});
