import { forbidden } from '../utils/httpError.js';

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return next(forbidden('no user on request'));
    if (!allowed.includes(req.user.role)) return next(forbidden('role not allowed'));
    next();
  };
}