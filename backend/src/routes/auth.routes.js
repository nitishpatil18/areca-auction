import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { register, login, me } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authRequired } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

// tighter limit on auth to slow brute-force
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login',    authLimiter, validate(loginSchema), login);
router.get('/me',        authRequired, me);

export default router;