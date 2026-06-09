import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

router.use(adminGuard);

router.get('/', conversationController.list);
router.get('/stats', conversationController.stats);
router.get('/:id', conversationController.detail);

export default router;
