import { Router } from 'express';
import {
  priceTrends, regionComparison, bidActivity, summary,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/summary',     summary);
router.get('/trends',      priceTrends);
router.get('/regions',     regionComparison);
router.get('/activity',    bidActivity);

export default router;