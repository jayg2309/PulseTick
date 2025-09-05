import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

export const configureCloudinary = (): void => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    logger.info('Cloudinary configured successfully');
  } catch (error) {
    logger.error('Failed to configure Cloudinary:', error);
    throw error;
  }
};

export { cloudinary };
