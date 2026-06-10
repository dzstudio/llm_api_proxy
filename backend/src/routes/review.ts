import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

// Admin-only routes
router.get('/', adminGuard, reviewController.list);
router.get('/stats', adminGuard, reviewController.stats);
router.post('/evaluate/:conversationId', adminGuard, reviewController.evaluate);

// Both roles: users see own reviews, admins see all (filtered in controller)
router.get('/:conversationId', reviewController.getByConversation);

export default router;
