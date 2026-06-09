import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

router.use(adminGuard);

router.get('/', reportController.list);
router.get('/stats', reportController.stats);
router.get('/:id', reportController.detail);

export default router;
