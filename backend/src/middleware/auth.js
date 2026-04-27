import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/httpError.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('missing token'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(unauthorized('invalid or expired token'));
  }
}