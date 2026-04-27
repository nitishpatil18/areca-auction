import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const createAuctionSchema = Joi.object({
  lotId:   objectId.required(),
  startAt: Joi.date().iso().required(),
  endAt:   Joi.date().iso().required(),
});

export const placeBidSchema = Joi.object({
  pricePerKg: Joi.number().positive().required(),
});

export const listAuctionsQuerySchema = Joi.object({
  status: Joi.string().valid('scheduled', 'live', 'closed', 'cancelled'),
}); 