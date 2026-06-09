import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

router.use(adminGuard);

router.get('/', reviewController.list);
router.post('/evaluate/:conversationId', reviewController.evaluate);
router.get('/:conversationId', reviewController.getByConversation);

export default router;
