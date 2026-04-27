import * as auctionService from '../services/auctionService.js';
import * as bidService from '../services/bidService.js';

export async function create(req, res, next) {
  try {
    const auction = await auctionService.createAuction({
      farmerId: req.user.id,
      lotId: req.body.lotId,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
    });
    res.status(201).json({ auction });
  } catch (e) { next(e); }
}

export async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const items = await auctionService.listAuctions(filter);
    res.json({ items });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const auction = await auctionService.getAuctionById(req.params.id);
    res.json({ auction });
  } catch (e) { next(e); }
}

export async function bidHistory(req, res, next) {
  try {
    const items = await auctionService.getBidHistory(req.params.id);
    res.json({ items });
  } catch (e) { next(e); }
}

export async function cancel(req, res, next) {
  try {
    const auction = await auctionService.cancelAuction({
      auctionId: req.params.id,
      userId: req.user.id,
      role: req.user.role,
    });
    res.json({ auction });
  } catch (e) { next(e); }
}

export async function placeBidViaRest(req, res, next) {
  try {
    const { auction, bid, extended } = await bidService.placeBid({
      auctionId: req.params.id,
      bidderId: req.user.id,
      pricePerKg: req.body.pricePerKg,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${auction._id}`).emit('bid:new', {
        auctionId: auction._id.toString(),
        pricePerKg: auction.currentBidPerKg,
        highestBidder: auction.highestBidder?.toString() || null,
        bidCount: auction.bidCount,
        at: bid.createdAt,
      });
      if (extended) {
        io.to(`auction:${auction._id}`).emit('auction:extended', {
          auctionId: auction._id.toString(),
          endAt: auction.endAt,
        });
      }
    }

    res.status(201).json({ bid, auction });
  } catch (e) { next(e); }
}

export async function myBids(req, res, next) {
  try {
    const Bid = (await import('../models/Bid.js')).default;
    const bids = await Bid.find({ bidder: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'auction',
        populate: [
          { path: 'lot', select: 'variety grade weightKg region' },
          { path: 'highestBidder', select: 'name' },
        ],
      })
      .lean();

    // for each bid, derive its status:
    // - winning: this bid is currently the highest on a live auction
    // - outbid:  not the highest on a live auction
    // - won:     was the winner of a closed auction
    // - lost:    was not the winner of a closed auction
    // - cancelled: auction was cancelled
    const items = bids.map((b) => {
      const a = b.auction;
      if (!a) return { ...b, status: 'unknown' };

      let status;
      const isLeader = a.highestBidder?._id?.toString() === req.user.id
        || a.highestBidder?.toString() === req.user.id;
      const wasMyBidTheTop = b.pricePerKg === a.currentBidPerKg && isLeader;

      if (a.status === 'live')      status = wasMyBidTheTop ? 'winning' : 'outbid';
      else if (a.status === 'closed') status = wasMyBidTheTop ? 'won'     : 'lost';
      else if (a.status === 'cancelled') status = 'cancelled';
      else status = 'pending';

      return {
        _id: b._id,
        pricePerKg: b.pricePerKg,
        amountTotal: b.amountTotal,
        createdAt: b.createdAt,
        status,
        auction: {
          _id: a._id,
          status: a.status,
          endAt: a.endAt,
          currentBidPerKg: a.currentBidPerKg,
          finalAmount: a.finalAmount,
          lot: a.lot,
        },
      };
    });

    res.json({ items });
  } catch (e) { next(e); }
}