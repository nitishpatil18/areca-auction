import { Router } from 'express';
import {
  priceTrends, regionComparison, bidActivity, summary, auctionStatusMix, insights,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/summary',     summary);
router.get('/trends',      priceTrends);
router.get('/regions',     regionComparison);
router.get('/activity',    bidActivity);
router.get('/status-mix',  auctionStatusMix);
router.get('/insights',    insights);

export default router;