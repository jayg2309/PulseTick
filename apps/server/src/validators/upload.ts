import { z } from 'zod';

export const getSignedUploadSchema = z.object({
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('auto'),
  folder: z.string().default('pulsetick'),
});

export const deleteMediaSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});

export const mediaParamsSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  resourceType: z.enum(['image', 'video', 'raw']).default('image'),
});
