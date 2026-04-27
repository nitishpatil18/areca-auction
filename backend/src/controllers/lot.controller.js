import Lot from '../models/Lot.js';
import { notFound, forbidden, badRequest } from '../utils/httpError.js';

const SORT_MAP = {
  newest:    { createdAt: -1 },
  oldest:    { createdAt:  1 },
  priceAsc:  { basePricePerKg:  1 },
  priceDesc: { basePricePerKg: -1 },
};

// public: anyone can browse lots that are listed
export async function listLots(req, res, next) {
  try {
    const { variety, grade, region, status, minPrice, maxPrice, page, limit, sort } = req.query;

    const filter = {};
    // default to only "listed" or "in_auction" for public view
    filter.status = status || { $in: ['listed', 'in_auction'] };
    if (variety) filter.variety = variety;
    if (grade)   filter.grade = grade;
    if (region)  filter.region = new RegExp(`^${region}$`, 'i');
    if (minPrice != null || maxPrice != null) {
      filter.basePricePerKg = {};
      if (minPrice != null) filter.basePricePerKg.$gte = minPrice;
      if (maxPrice != null) filter.basePricePerKg.$lte = maxPrice;
    }

    const [items, total] = await Promise.all([
      Lot.find(filter)
        .sort(SORT_MAP[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('farmer', 'name region')
        .lean(),
      Lot.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) { next(e); }
}

export async function getLotById(req, res, next) {
  try {
    const lot = await Lot.findById(req.params.id).populate('farmer', 'name region').lean();
    if (!lot) throw notFound('lot not found');
    res.json({ lot });
  } catch (e) { next(e); }
}

// farmer-only
export async function createLot(req, res, next) {
  try {
    const lot = await Lot.create({
      ...req.body,
      farmer: req.user.id,
      status: 'listed', // created lots go straight to listed; can be changed later
    });
    res.status(201).json({ lot });
  } catch (e) { next(e); }
}

// farmer's own lots
export async function listMyLots(req, res, next) {
  try {
    const items = await Lot.find({ farmer: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) { next(e); }
}

export async function updateLot(req, res, next) {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) throw notFound('lot not found');
    if (lot.farmer.toString() !== req.user.id) throw forbidden('not your lot');
    if (lot.status === 'in_auction') throw badRequest('cannot edit lot during auction');
    if (lot.status === 'sold') throw badRequest('cannot edit a sold lot');

    Object.assign(lot, req.body);
    await lot.save();
    res.json({ lot });
  } catch (e) { next(e); }
}

export async function deleteLot(req, res, next) {
  try {
    const lot = await Lot.findById(req.params.id);
    if (!lot) throw notFound('lot not found');
    if (lot.farmer.toString() !== req.user.id) throw forbidden('not your lot');
    if (lot.status === 'in_auction') throw badRequest('cannot delete lot during auction');
    if (lot.status === 'sold') throw badRequest('cannot delete a sold lot');

    await lot.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
}