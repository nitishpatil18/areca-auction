import Joi from 'joi';

export const topUpSchema = Joi.object({
  amount: Joi.number().positive().max(10000000).required(),
});