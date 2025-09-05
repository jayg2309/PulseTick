import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';
import {
  sendMessageSchema,
  getMessagesQuerySchema,
  messageParamsSchema,
  editMessageSchema,
  addReactionSchema,
} from '../validators/message';
import { groupParamsSchema } from '../validators/group';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Message CRUD
router.get(
  '/:groupId',
  validateRequest({ params: groupParamsSchema, query: getMessagesQuerySchema }),
  MessageController.getMessages
);

router.post(
  '/:groupId',
  validateRequest({ params: groupParamsSchema, body: sendMessageSchema }),
  MessageController.sendMessage
);

router.patch(
  '/:groupId/:messageId',
  validateRequest({ params: messageParamsSchema, body: editMessageSchema }),
  MessageController.editMessage
);

router.delete(
  '/:groupId/:messageId',
  validateRequest({ params: messageParamsSchema }),
  MessageController.deleteMessage
);

// Message reactions
router.post(
  '/:groupId/:messageId/reactions',
  validateRequest({ params: messageParamsSchema, body: addReactionSchema }),
  MessageController.addReaction
);

router.delete(
  '/:groupId/:messageId/reactions',
  validateRequest({ params: messageParamsSchema }),
  MessageController.removeReaction
);

// Message search
router.get(
  '/:groupId/search',
  validateRequest({ params: groupParamsSchema }),
  MessageController.searchMessages
);

export default router;
