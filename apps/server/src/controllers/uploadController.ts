import { Response } from 'express';
import { cloudinary } from '../config/cloudinary';
import { createError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logger } from '../config/logger';

export class UploadController {
  static async getSignedUploadUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resourceType = 'auto', folder = 'pulsetick' } = req.body;
      const userId = req.user?._id;

      // Generate timestamp for signature
      const timestamp = Math.round(new Date().getTime() / 1000);

      // Create upload parameters
      const uploadParams = {
        timestamp,
        folder: `${folder}/${userId}`,
        resource_type: resourceType,
        allowed_formats: resourceType === 'image' 
          ? ['jpg', 'jpeg', 'png', 'gif', 'webp']
          : resourceType === 'video'
          ? ['mp4', 'mov', 'avi', 'mkv', 'webm']
          : ['pdf', 'doc', 'docx', 'txt', 'zip'],
        max_file_size: resourceType === 'video' ? 100000000 : 10000000, // 100MB for video, 10MB for others
      };

      // Generate signature
      const signature = cloudinary.utils.api_sign_request(
        uploadParams,
        process.env.CLOUDINARY_API_SECRET!
      );

      logger.info(`Signed upload URL generated for user: ${req.user?.username}`);

      res.json({
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        uploadParams: {
          ...uploadParams,
          signature,
          api_key: process.env.CLOUDINARY_API_KEY,
        },
      });
    } catch (error) {
      logger.error('Error generating signed upload URL:', error);
      throw createError('Failed to generate upload URL', 500);
    }
  }

  static async deleteMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { publicId, resourceType = 'image' } = req.body;

      if (!publicId) {
        throw createError('Public ID is required', 400);
      }

      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result !== 'ok') {
        throw createError('Failed to delete media', 500);
      }

      logger.info(`Media deleted: ${publicId} by ${req.user?.username}`);

      res.json({
        message: 'Media deleted successfully',
        publicId,
      });
    } catch (error) {
      logger.error('Error deleting media:', error);
      throw error;
    }
  }

  static async getMediaInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { publicId, resourceType = 'image' } = req.params;

      // Get media info from Cloudinary
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      res.json({
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
      });
    } catch (error) {
      logger.error('Error getting media info:', error);
      throw createError('Media not found', 404);
    }
  }
}
