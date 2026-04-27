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