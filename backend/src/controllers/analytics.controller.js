import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Lot from '../models/Lot.js';

// price trends: avg final price per variety per day, last 90 days
export async function priceTrends(req, res, next) {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const data = await Auction.aggregate([
      { $match: { status: 'closed', settledAt: { $gte: cutoff }, currentBidPerKg: { $gt: 0 } } },
      { $lookup: { from: 'lots', localField: 'lot', foreignField: '_id', as: 'lotDoc' } },
      { $unwind: '$lotDoc' },
      {
        $group: {
          _id: {
            variety: '$lotDoc.variety',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$settledAt' } },
          },
          avgPrice: { $avg: '$currentBidPerKg' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    // reshape to { variety: [{ day, avgPrice, count }] }
    const series = {};
    for (const row of data) {
      const v = row._id.variety;
      if (!series[v]) series[v] = [];
      series[v].push({ day: row._id.day, avgPrice: Math.round(row.avgPrice * 100) / 100, count: row.count });
    }

    res.json({ series });
  } catch (e) { next(e); }
}

// region comparison: avg price per region across all closed auctions
export async function regionComparison(req, res, next) {
  try {
    const data = await Auction.aggregate([
      { $match: { status: 'closed', currentBidPerKg: { $gt: 0 } } },
      { $lookup: { from: 'lots', localField: 'lot', foreignField: '_id', as: 'lotDoc' } },
      { $unwind: '$lotDoc' },
      {
        $group: {
          _id: '$lotDoc.region',
          avgPrice: { $avg: '$currentBidPerKg' },
          minPrice: { $min: '$currentBidPerKg' },
          maxPrice: { $max: '$currentBidPerKg' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgPrice: -1 } },
    ]);

    res.json({
      regions: data.map((r) => ({
        region: r._id,
        avgPrice: Math.round(r.avgPrice * 100) / 100,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
        count: r.count,
      })),
    });
  } catch (e) { next(e); }
}

// bid frequency: total bids per day, last 30 days
export async function bidActivity(req, res, next) {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const data = await Bid.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bids: { $sum: 1 },
          totalAmount: { $sum: '$amountTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      activity: data.map((d) => ({
        day: d._id,
        bids: d.bids,
        totalAmount: d.totalAmount,
      })),
    });
  } catch (e) { next(e); }
}

// summary stats for top of page
export async function summary(req, res, next) {
  try {
    const [
      totalAuctions, closedAuctions, totalBids, totalLots,
    ] = await Promise.all([
      Auction.countDocuments({}),
      Auction.countDocuments({ status: 'closed' }),
      Bid.countDocuments({}),
      Lot.countDocuments({}),
    ]);

    const closedSummary = await Auction.aggregate([
      { $match: { status: 'closed', currentBidPerKg: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$currentBidPerKg' },
          totalSettled: { $sum: '$finalAmount' },
        },
      },
    ]);

    res.json({
      totalAuctions,
      closedAuctions,
      totalBids,
      totalLots,
      avgClosedPricePerKg: closedSummary[0]
        ? Math.round(closedSummary[0].avgPrice * 100) / 100
        : 0,
      totalSettledAmount: closedSummary[0]?.totalSettled || 0,
    });
  } catch (e) { next(e); }
}