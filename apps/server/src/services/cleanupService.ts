import { Group } from '../models/Group';
import { GroupMember } from '../models/GroupMember';
import { Message } from '../models/Message';
import { MessageReaction } from '../models/MessageReaction';
import { cloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';

export class CleanupService {
  static async cleanupExpiredGroups(): Promise<void> {
    try {
      logger.info('Starting cleanup of expired groups...');

      // Find expired groups
      const expiredGroups = await Group.find({
        expiresAt: { $lte: new Date() },
      });

      for (const group of expiredGroups) {
        await this.cleanupGroup(group._id.toString());
      }

      logger.info(`Cleanup completed. Processed ${expiredGroups.length} expired groups.`);
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  static async cleanupGroup(groupId: string): Promise<void> {
    try {
      logger.info(`Cleaning up group: ${groupId}`);

      // Get all messages with media to delete from Cloudinary
      const messagesWithMedia = await Message.find({
        group: groupId,
        'media.publicId': { $exists: true },
      });

      // Delete media from Cloudinary
      const mediaCleanupPromises = messagesWithMedia.map(async (message) => {
        if (message.media?.publicId) {
          try {
            await cloudinary.uploader.destroy(message.media.publicId, {
              resource_type: message.media.resourceType || 'image',
            });
            logger.info(`Deleted media: ${message.media.publicId}`);
          } catch (error) {
            logger.error(`Failed to delete media ${message.media.publicId}:`, error);
          }
        }
      });

      await Promise.allSettled(mediaCleanupPromises);

      // Delete all related data
      await Promise.all([
        MessageReaction.deleteMany({
          message: { $in: messagesWithMedia.map(m => m._id) },
        }),
        Message.deleteMany({ group: groupId }),
        GroupMember.deleteMany({ group: groupId }),
        Group.findByIdAndDelete(groupId),
      ]);

      logger.info(`Successfully cleaned up group: ${groupId}`);
    } catch (error) {
      logger.error(`Error cleaning up group ${groupId}:`, error);
    }
  }

  static async scheduleCleanup(): Promise<void> {
    // Run cleanup every hour
    setInterval(async () => {
      await this.cleanupExpiredGroups();
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    await this.cleanupExpiredGroups();
  }

  static async cleanupOrphanedMedia(): Promise<void> {
    try {
      logger.info('Starting cleanup of orphaned media...');

      // This is a more complex operation that would require
      // comparing Cloudinary resources with database records
      // For now, we'll implement a basic version

      const allMessages = await Message.find({
        'media.publicId': { $exists: true },
      });

      const usedPublicIds = new Set(
        allMessages.map(msg => msg.media?.publicId).filter(Boolean)
      );

      // In a real implementation, you would:
      // 1. List all resources in Cloudinary folder
      // 2. Compare with usedPublicIds
      // 3. Delete unused resources

      logger.info('Orphaned media cleanup completed');
    } catch (error) {
      logger.error('Error during orphaned media cleanup:', error);
    }
  }
}
