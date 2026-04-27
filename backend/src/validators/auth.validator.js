import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('farmer', 'buyer').required(),
  region: Joi.string().max(80).optional(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});