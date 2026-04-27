import Joi from 'joi';

const VARIETIES = ['Bette', 'Rashi', 'Sippe', 'Other'];
const GRADES = ['A', 'B', 'C'];
const STATUSES = ['draft', 'listed', 'in_auction', 'sold', 'cancelled'];

export const createLotSchema = Joi.object({
  variety: Joi.string().valid(...VARIETIES).required(),
  grade:   Joi.string().valid(...GRADES).required(),
  weightKg:       Joi.number().min(0.1).required(),
  basePricePerKg: Joi.number().min(0).required(),
  region:      Joi.string().min(2).max(80).required(),
  moisturePct: Joi.number().min(0).max(100).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  images:      Joi.array().items(Joi.string().uri()).max(8).optional(),
});

// all fields optional for partial update; at least one must be present
export const updateLotSchema = Joi.object({
  variety: Joi.string().valid(...VARIETIES),
  grade:   Joi.string().valid(...GRADES),
  weightKg:       Joi.number().min(0.1),
  basePricePerKg: Joi.number().min(0),
  region:      Joi.string().min(2).max(80),
  moisturePct: Joi.number().min(0).max(100),
  description: Joi.string().max(1000).allow(''),
  images:      Joi.array().items(Joi.string().uri()).max(8),
  status:      Joi.string().valid('draft', 'listed', 'cancelled'),
}).min(1);

export const listLotsQuerySchema = Joi.object({
  variety: Joi.string().valid(...VARIETIES),
  grade:   Joi.string().valid(...GRADES),
  region:  Joi.string().max(80),
  status:  Joi.string().valid(...STATUSES),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sort:  Joi.string().valid('newest', 'oldest', 'priceAsc', 'priceDesc').default('newest'),
});