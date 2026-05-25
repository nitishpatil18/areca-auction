import { Router } from 'express';
import {
  listUsers, setUserRole, listAuctions, forceCloseAuction, dashboardStats,
  listFailedSettlements,
  listPendingPasswordResets,
} from '../controllers/admin.controller.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

// every admin route requires admin role
router.use(authRequired, requireRole('admin'));

router.get('/stats',                  dashboardStats);
router.get('/failed-settlements',     listFailedSettlements);
router.get('/pending-password-resets', listPendingPasswordResets);
router.get('/users',                  listUsers);
router.patch('/users/:id/role',       setUserRole);
router.get('/auctions',               listAuctions);
router.post('/auctions/:id/close',    forceCloseAuction);

export default router;