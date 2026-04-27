import Auction from '../models/Auction.js';
import Lot from '../models/Lot.js';
import User from '../models/User.js';
import Bid from '../models/Bid.js';
import Transaction from '../models/Transaction.js';
import * as chainService from './chainService.js';
import { notFound, badRequest, forbidden } from '../utils/httpError.js';

const MIN_DURATION_MS = 30 * 1000;

export async function createAuction({ farmerId, lotId, startAt, endAt }) {
  const lot = await Lot.findById(lotId);
  if (!lot) throw notFound('lot not found');
  if (lot.farmer.toString() !== farmerId) throw forbidden('not your lot');
  if (lot.status !== 'listed') throw badRequest(`lot must be listed, current: ${lot.status}`);

  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = Date.now();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw badRequest('invalid dates');
  if (end <= start) throw badRequest('endAt must be after startAt');
  if (start.getTime() < now - 60_000) throw badRequest('startAt must be in the future');
  if (end - start < MIN_DURATION_MS) throw badRequest('duration must be at least 30 seconds');

  const existing = await Auction.findOne({ lot: lotId });
  if (existing) throw badRequest('an auction already exists for this lot');

  // mirror to chain (non-blocking failure: if chain is down, auction still works off-chain)
  let onChain = null;
  try {
    onChain = await chainService.createOnChainAuction({
      basePricePerKg: lot.basePricePerKg,
      weightKg: lot.weightKg,
      endAt: end,
    });
  } catch { /* ignore */ }

  const auction = await Auction.create({
    lot: lotId,
    farmer: farmerId,
    status: 'scheduled',
    startAt: start,
    endAt: end,
    basePricePerKg: lot.basePricePerKg,
    onChainAuctionId: onChain?.onChainAuctionId || null,
    createTxHash: onChain?.txHash || null,
  });

  lot.status = 'in_auction';
  await lot.save();

  return auction;
}

export async function listAuctions(filter = {}) {
  return Auction.find(filter)
    .populate({ path: 'lot' })
    .populate('farmer', 'name region')
    .populate('highestBidder', 'name')
    .sort({ endAt: 1 })
    .lean();
}

export async function getAuctionById(id) {
  const auction = await Auction.findById(id)
    .populate({ path: 'lot' })
    .populate('farmer', 'name region')
    .populate('highestBidder', 'name')
    .lean();
  if (!auction) throw notFound('auction not found');
  return auction;
}

export async function getBidHistory(auctionId, limit = 50) {
  return Bid.find({ auction: auctionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('bidder', 'name')
    .lean();
}

export async function cancelAuction({ auctionId, userId, role }) {
  const auction = await Auction.findById(auctionId);
  if (!auction) throw notFound('auction not found');
  if (role !== 'admin' && auction.farmer.toString() !== userId) throw forbidden('not your auction');
  if (auction.status !== 'scheduled') throw badRequest('only scheduled auctions can be cancelled');

  auction.status = 'cancelled';
  await auction.save();
  await Lot.findByIdAndUpdate(auction.lot, { status: 'listed' });

  return auction;
}

export async function transitionToLive(auctionId) {
  return Auction.findOneAndUpdate(
    { _id: auctionId, status: 'scheduled', startAt: { $lte: new Date() } },
    { $set: { status: 'live' } },
    { new: true },
  );
}

export async function settleAndClose(auctionId) {
  // atomic close: only one worker can transition live -> closed
  const auction = await Auction.findOneAndUpdate(
    { _id: auctionId, status: 'live' },
    { $set: { status: 'closed' } },
    { new: true },
  ).populate('lot');

  if (!auction) return null;
  const lot = auction.lot;

  if (auction.highestBidder && auction.currentBidPerKg > 0 && lot) {
    const winner = await User.findById(auction.highestBidder);
    const farmer = await User.findById(auction.farmer);
    const totalAmount = auction.currentBidPerKg * lot.weightKg;

    if (winner && farmer && winner.walletBalance >= totalAmount) {
      winner.walletBalance -= totalAmount;
      farmer.walletBalance += totalAmount;
      await winner.save();
      await farmer.save();

      auction.finalAmount = totalAmount;
      auction.settledAt = new Date();
      await auction.save();

      await Transaction.create({
        user: winner._id, type: 'auction_settlement',
        amount: -totalAmount, auction: auction._id, meta: { lot: lot._id },
      });
      await Transaction.create({
        user: farmer._id, type: 'farmer_payout',
        amount: totalAmount, auction: auction._id, meta: { lot: lot._id },
      });

      lot.status = 'sold';
      await lot.save();
    } else {
      auction.finalAmount = 0;
      await auction.save();
      lot.status = 'listed';
      await lot.save();
    }
  } else if (lot) {
    lot.status = 'listed';
    await lot.save();
  }

  return auction;
}