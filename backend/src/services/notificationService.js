import Notification from '../models/Notification.js';

let ioRef = null;

// the socket layer calls this on startup so the service can emit
export function attachIO(io) { ioRef = io; }

/**
 * create a notification for a single user and (optionally) push it
 * to their personal socket room.
 */
export async function create({ user, type, title, body = '', link = '' }) {
  const n = await Notification.create({ user, type, title, body, link });
  if (ioRef && user) {
    ioRef.to(`user:${user.toString()}`).emit('notification:new', {
      _id: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt,
    });
  }
  return n;
}

export async function listForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const filter = { user: userId };
  if (unreadOnly) filter.read = false;
  const skip = (page - 1) * limit;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return { items, page, limit, total, unread, totalPages: Math.ceil(total / limit) };
}

export async function markRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true } },
    { new: true },
  );
}

export async function markAllRead(userId) {
  const r = await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
  return { modified: r.modifiedCount };
}
