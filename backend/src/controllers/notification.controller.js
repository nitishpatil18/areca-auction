import * as notificationService from '../services/notificationService.js';

export async function listMine(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const unreadOnly = req.query.unread === 'true';
    const result = await notificationService.listForUser(req.user.id, { page, limit, unreadOnly });
    res.json(result);
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const n = await notificationService.markRead(req.user.id, req.params.id);
    if (!n) return res.status(404).json({ error: 'notification not found' });
    res.json(n);
  } catch (e) { next(e); }
}

export async function markAllRead(req, res, next) {
  try {
    const r = await notificationService.markAllRead(req.user.id);
    res.json(r);
  } catch (e) { next(e); }
}
