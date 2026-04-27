import { Router } from 'express';

import {
  listLots, getLotById, createLot, listMyLots, updateLot, deleteLot,
} from '../controllers/lot.controller.js';

import { validate } from '../middleware/validate.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import {
  createLotSchema, updateLotSchema, listLotsQuerySchema,
} from '../validators/lot.validator.js';

const router = Router();

// public
router.get('/', validate(listLotsQuerySchema, 'query'), listLots);

// farmer-specific lookup must come BEFORE :id so 'mine' isn't treated as an id
router.get('/mine', authRequired, requireRole('farmer'), listMyLots);

router.get('/:id', getLotById);

// farmer-only writes
router.post('/',       authRequired, requireRole('farmer'), validate(createLotSchema), createLot);
router.patch('/:id',   authRequired, requireRole('farmer'), validate(updateLotSchema), updateLot);
router.delete('/:id',  authRequired, requireRole('farmer'), deleteLot);

export default router;