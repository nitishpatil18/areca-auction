import { Router } from 'express';
import { getStatus, topUp } from '../controllers/wallet.controller.js';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { topUpSchema } from '../validators/wallet.validator.js';

const router = Router();

router.get('/',       authRequired, getStatus);
router.post('/topup', authRequired, validate(topUpSchema), topUp);

export default router;