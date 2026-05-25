import { Router } from 'express';
import { publicStats, featuredAuction } from '../controllers/public.controller.js';

const router = Router();
router.get('/stats',            publicStats);
router.get('/featured-auction', featuredAuction);
export default router;
