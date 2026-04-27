import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Lot from '../models/Lot.js';
import Bid from '../models/Bid.js';
import * as auctionService from '../services/auctionService.js';
import { notFound, badRequest } from '../utils/httpError.js';

export async function listUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: users });
  } catch (e) { next(e); }
}

export async function setUserRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['farmer', 'buyer', 'admin'].includes(role)) {
      throw badRequest('invalid role');
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-passwordHash' },
    );
    if (!user) throw notFound('user not found');
    res.json({ user });
  } catch (e) { next(e); }
}

export async function listAuctions(req, res, next) {
  try {
    const items = await Auction.find()
      .populate('lot', 'variety grade weightKg region')
      .populate('farmer', 'name email')
      .populate('highestBidder', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items });
  } catch (e) { next(e); }
}

export async function forceCloseAuction(req, res, next) {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) throw notFound('auction not found');
    if (auction.status !== 'live' && auction.status !== 'scheduled') {
      throw badRequest(`cannot force-close auction in status ${auction.status}`);
    }

    if (auction.status === 'scheduled') {
      // not started yet; cancel cleanly
      auction.status = 'cancelled';
      await auction.save();
      await Lot.findByIdAndUpdate(auction.lot, { status: 'listed' });
      return res.json({ auction });
    }

    // live: settle and close right now
    const closed = await auctionService.settleAndClose(auction._id);
    const io = req.app.get('io');
    if (io && closed) {
      io.to(`auction:${closed._id}`).emit('auction:closed', {
        auctionId: closed._id.toString(),
        winner: closed.highestBidder?.toString() || null,
        finalPricePerKg: closed.currentBidPerKg,
        finalAmount: closed.finalAmount || 0,
      });
    }
    res.json({ auction: closed });
  } catch (e) { next(e); }
}

export async function dashboardStats(req, res, next) {
  try {
    const [
      users, lots, auctions, bids,
      liveAuctions, scheduledAuctions,
    ] = await Promise.all([
      User.countDocuments(),
      Lot.countDocuments(),
      Auction.countDocuments(),
      Bid.countDocuments(),
      Auction.countDocuments({ status: 'live' }),
      Auction.countDocuments({ status: 'scheduled' }),
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    res.json({
      users, lots, auctions, bids,
      liveAuctions, scheduledAuctions,
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r._id, r.count])),
    });
  } catch (e) { next(e); }
}