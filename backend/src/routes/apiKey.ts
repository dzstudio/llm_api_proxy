import { Router } from 'express';
import * as apiKeyController from '../controllers/apiKeyController.js';

const router = Router();

router.get('/', apiKeyController.list);
router.post('/', apiKeyController.create);
router.post('/:id/reset', apiKeyController.reset);
router.patch('/:id/status', apiKeyController.toggleStatus);
router.delete('/:id', apiKeyController.remove);

export default router;
