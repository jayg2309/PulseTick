import { Router } from 'express';
import { GroupController } from '../controllers/groupController';
import { validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';
import {
  createGroupSchema,
  updateGroupSchema,
  joinGroupSchema,
  updateMemberRoleSchema,
  banMemberSchema,
  groupParamsSchema,
  memberParamsSchema,
} from '../validators/group';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Group CRUD
router.post(
  '/',
  validateRequest({ body: createGroupSchema }),
  GroupController.createGroup
);

router.get('/', GroupController.getGroups);

router.get(
  '/:groupId',
  validateRequest({ params: groupParamsSchema }),
  GroupController.getGroup
);

router.patch(
  '/:groupId',
  validateRequest({ params: groupParamsSchema, body: updateGroupSchema }),
  GroupController.updateGroup
);

router.delete(
  '/:groupId',
  validateRequest({ params: groupParamsSchema }),
  GroupController.deleteGroup
);

// Group membership
router.post(
  '/join',
  validateRequest({ body: joinGroupSchema }),
  GroupController.joinGroup
);

router.delete(
  '/:groupId/leave',
  validateRequest({ params: groupParamsSchema }),
  GroupController.leaveGroup
);

// Member management
router.get(
  '/:groupId/members',
  validateRequest({ params: groupParamsSchema }),
  GroupController.getMembers
);

router.patch(
  '/:groupId/members/:userId/role',
  validateRequest({ params: memberParamsSchema, body: updateMemberRoleSchema }),
  GroupController.updateMemberRole
);

router.post(
  '/:groupId/members/:userId/ban',
  validateRequest({ params: memberParamsSchema, body: banMemberSchema }),
  GroupController.banMember
);

// Invite code management
router.post(
  '/:groupId/invite-code/regenerate',
  validateRequest({ params: groupParamsSchema }),
  GroupController.generateNewInviteCode
);

export default router;
