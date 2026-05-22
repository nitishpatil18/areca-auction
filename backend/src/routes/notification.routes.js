import { Router } from 'express';
import { listMine, markRead, markAllRead } from '../controllers/notification.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/',                authRequired, listMine);
router.patch('/:id/read',      authRequired, markRead);
router.post('/read-all',       authRequired, markAllRead);

export default router;
