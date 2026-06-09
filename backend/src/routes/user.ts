import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

router.use(adminGuard);

router.get('/', userController.list);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);
router.patch('/:id/status', userController.toggleStatus);

export default router;
