import { Router } from 'express';
import * as apiKeyController from '../controllers/apiKeyController.js';
import { adminGuard } from '../middleware/auth.js';

const router = Router();

// All authenticated users can view their own keys (service filters by role)
router.get('/', apiKeyController.list);

// Only admins can create/reset/toggle/delete
router.post('/', adminGuard, apiKeyController.create);
router.post('/:id/reset', adminGuard, apiKeyController.reset);
router.patch('/:id/status', adminGuard, apiKeyController.toggleStatus);
router.delete('/:id', adminGuard, apiKeyController.remove);

export default router;
