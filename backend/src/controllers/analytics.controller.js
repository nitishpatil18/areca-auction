import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Lot from '../models/Lot.js';

// price trends: avg final price per variety per day, configurable window
export async function priceTrends(req, res, next) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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

// bid frequency: total bids per day, configurable window
export async function bidActivity(req, res, next) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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

// auction status mix for donut chart
export async function auctionStatusMix(req, res, next) {
  try {
    const data = await Auction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    res.json({
      mix: data.map((d) => ({ status: d._id, count: d.count })),
    });
  } catch (e) { next(e); }
}

// auto-derived insight callouts
export async function insights(req, res, next) {
  try {
    const items = [];

    // 1. best-selling variety in last 30 days
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const topVariety = await Auction.aggregate([
      { $match: { status: 'closed', settledAt: { $gte: recent }, currentBidPerKg: { $gt: 0 } } },
      { $lookup: { from: 'lots', localField: 'lot', foreignField: '_id', as: 'lotDoc' } },
      { $unwind: '$lotDoc' },
      { $group: { _id: '$lotDoc.variety', avgPrice: { $avg: '$currentBidPerKg' }, count: { $sum: 1 } } },
      { $sort: { avgPrice: -1 } },
      { $limit: 1 },
    ]);
    if (topVariety[0]) {
      items.push({
        type: 'best_variety',
        title: 'Top performer',
        text: `${topVariety[0]._id} fetched ₹${Math.round(topVariety[0].avgPrice)}/kg average — your highest-earning variety.`,
        tone: 'green',
      });
    }

    // 2. best-paying region
    const topRegion = await Auction.aggregate([
      { $match: { status: 'closed', currentBidPerKg: { $gt: 0 } } },
      { $lookup: { from: 'lots', localField: 'lot', foreignField: '_id', as: 'lotDoc' } },
      { $unwind: '$lotDoc' },
      { $group: { _id: '$lotDoc.region', avgPrice: { $avg: '$currentBidPerKg' }, count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $sort: { avgPrice: -1 } },
      { $limit: 1 },
    ]);
    if (topRegion[0]) {
      items.push({
        type: 'best_region',
        title: 'Best market',
        text: `${topRegion[0]._id} pays the highest at ₹${Math.round(topRegion[0].avgPrice)}/kg average across ${topRegion[0].count} closed auctions.`,
        tone: 'blue',
      });
    }

    // 3. activity trend: bids in last 7 days vs previous 7
    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const prev7 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [last7Count, prev7Count] = await Promise.all([
      Bid.countDocuments({ createdAt: { $gte: last7 } }),
      Bid.countDocuments({ createdAt: { $gte: prev7, $lt: last7 } }),
    ]);
    if (prev7Count > 0) {
      const pct = Math.round(((last7Count - prev7Count) / prev7Count) * 100);
      items.push({
        type: 'activity_trend',
        title: 'Bid activity',
        text: pct >= 0
          ? `Bidding is up ${pct}% week over week (${last7Count} vs ${prev7Count}).`
          : `Bidding is down ${Math.abs(pct)}% week over week (${last7Count} vs ${prev7Count}).`,
        tone: pct >= 0 ? 'green' : 'amber',
      });
    }

    // 4. settlement health
    const [closedCount, cancelledFailureCount] = await Promise.all([
      Auction.countDocuments({ status: 'closed' }),
      Auction.countDocuments({ status: 'cancelled', settlementFailureReason: { $ne: null, $ne: 'no_bids' } }),
    ]);
    if (closedCount + cancelledFailureCount > 0) {
      const successRate = Math.round((closedCount / (closedCount + cancelledFailureCount)) * 100);
      items.push({
        type: 'settlement_health',
        title: 'Settlement rate',
        text: `${successRate}% of auctions with bids settled successfully (${closedCount} of ${closedCount + cancelledFailureCount}).`,
        tone: successRate >= 90 ? 'green' : successRate >= 70 ? 'amber' : 'red',
      });
    }

    res.json({ items });
  } catch (e) { next(e); }
}
