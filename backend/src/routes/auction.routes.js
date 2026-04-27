import { Router } from 'express';

import {
  create, list, getById, bidHistory, cancel, placeBidViaRest, myBids,
} from '../controllers/auction.controller.js';
import { downloadInvoice } from '../controllers/invoice.controller.js';

import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createAuctionSchema, placeBidSchema, listAuctionsQuerySchema,
} from '../validators/auction.validator.js';

const router = Router();

router.get('/',           validate(listAuctionsQuerySchema, 'query'), list);

// must come before /:id
router.get('/my/bids',    authRequired, requireRole('buyer'), myBids);

router.get('/:id',                getById);
router.get('/:id/bids',           bidHistory);
router.get('/:id/invoice',        authRequired, downloadInvoice);

router.post('/',                  authRequired, requireRole('farmer'), validate(createAuctionSchema), create);
router.post('/:id/bids',          authRequired, requireRole('buyer'),  validate(placeBidSchema), placeBidViaRest);
router.post('/:id/cancel',        authRequired, requireRole('farmer', 'admin'), cancel);

export default router;