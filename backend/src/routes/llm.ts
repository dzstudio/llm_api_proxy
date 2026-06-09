import { Router } from 'express';
import * as gatewayController from '../gateway/gatewayController.js';

const router = Router();

router.post('/v1/chat/completions', gatewayController.chatCompletions);

export default router;
