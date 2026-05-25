import User from '../models/User.js';
import Lot from '../models/Lot.js';
import Auction from '../models/Auction.js';

// public-safe platform stats. no user-identifiable info.
export async function publicStats(req, res, next) {
  try {
    const [totalUsers, totalLots, totalAuctions, soldLots, settledAgg] = await Promise.all([
      User.countDocuments(),
      Lot.countDocuments(),
      Auction.countDocuments(),
      Lot.countDocuments({ status: 'sold' }),
      Auction.aggregate([
        { $match: { status: 'closed', finalAmount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalLots,
      totalAuctions,
      soldLots,
      totalSettledValue: settledAgg[0]?.total || 0,
    });
  } catch (e) { next(e); }
}

// featured auction — preference order:
//   1. live auction with most bids (real activity beats anything else)
//   2. next scheduled auction (gives "coming up" signal)
//   3. most recently closed auction (still shows real activity)
//   4. null (frontend renders empty state)
export async function featuredAuction(req, res, next) {
  try {
    let auction = await Auction.findOne({ status: 'live' })
      .sort({ bidCount: -1, currentBidPerKg: -1 })
      .populate('lot', 'variety grade weightKg region')
      .populate('farmer', 'name region')
      .populate('highestBidder', 'name')
      .lean();

    if (!auction) {
      auction = await Auction.findOne({ status: 'scheduled' })
        .sort({ startAt: 1 })
        .populate('lot', 'variety grade weightKg region')
        .populate('farmer', 'name region')
        .lean();
    }

    if (!auction) {
      auction = await Auction.findOne({ status: 'closed', finalAmount: { $gt: 0 } })
        .sort({ settledAt: -1 })
        .populate('lot', 'variety grade weightKg region')
        .populate('farmer', 'name region')
        .populate('highestBidder', 'name')
        .lean();
    }

    res.json({ auction: auction || null });
  } catch (e) { next(e); }
}
