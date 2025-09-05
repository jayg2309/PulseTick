import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';
import {
  getSignedUploadSchema,
  deleteMediaSchema,
  mediaParamsSchema,
} from '../validators/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get signed upload URL
router.post(
  '/signed-url',
  validateRequest({ body: getSignedUploadSchema }),
  UploadController.getSignedUploadUrl
);

// Delete media
router.delete(
  '/media',
  validateRequest({ body: deleteMediaSchema }),
  UploadController.deleteMedia
);

// Get media info
router.get(
  '/media/:resourceType/:publicId',
  validateRequest({ params: mediaParamsSchema }),
  UploadController.getMediaInfo
);

export default router;
