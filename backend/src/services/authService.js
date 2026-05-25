import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { conflict, unauthorized, badRequest } from '../utils/httpError.js';

function signToken(user) {
  const payload = { id: user._id.toString(), role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

export async function registerUser(input) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw conflict('email already registered');

  const passwordHash = await User.hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    region: input.region || null,
    walletAddress: input.walletAddress || null,
  });

  return { user: user.toSafeJSON(), token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw unauthorized('invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw unauthorized('invalid email or password');

  return { user: user.toSafeJSON(), token: signToken(user) };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw badRequest('user not found');
  return user.toSafeJSON();
}

import { randomBytes } from 'node:crypto';

// in production this token would be emailed to the user and hashed in db.
// for this demo, we store plain so admin can reveal it in the dashboard.
// expiry is short (1 hour) to limit window.
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export async function requestPasswordReset({ email }) {
  const user = await User.findOne({ email });
  // intentionally vague: do not reveal whether the email exists, to prevent
  // account enumeration. always return success.
  if (!user) return { ok: true };
  user.passwordResetToken = randomBytes(32).toString('hex');
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();
  return { ok: true };
}

export async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) throw badRequest('token and newPassword required');
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw badRequest('invalid or expired token');
  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
  return { ok: true };
}
