import { Router } from 'express';
import * as modelController from '../controllers/modelController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

router.use(adminGuard);

router.get('/', modelController.list);
router.post('/', modelController.create);
router.put('/:id', modelController.update);
router.delete('/:id', modelController.remove);
router.patch('/:id/status', modelController.toggleStatus);
router.patch('/:id/review', modelController.setReview);

export default router;
