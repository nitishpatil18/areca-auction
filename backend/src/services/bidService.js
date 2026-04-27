import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Lot from '../models/Lot.js';
import User from '../models/User.js';
import { getHeldAmount } from './walletService.js';
import { badRequest, notFound, forbidden } from '../utils/httpError.js';

const MIN_INCREMENT = Number(process.env.MIN_BID_INCREMENT || 1);
const ANTISNIPE_WINDOW_MS  = Number(process.env.ANTISNIPE_WINDOW_MS  || 30_000); // last 30s
const ANTISNIPE_EXTEND_MS  = Number(process.env.ANTISNIPE_EXTEND_MS  || 30_000); // extend by 30s

export async function placeBid({ auctionId, bidderId, pricePerKg }) {
  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
    throw badRequest('pricePerKg must be a positive number');
  }

  const auction = await Auction.findById(auctionId);
  if (!auction) throw notFound('auction not found');
  if (auction.status !== 'live') throw badRequest('auction is not live');
  if (Date.now() >= auction.endAt.getTime()) throw badRequest('auction has ended');

  const lot = await Lot.findById(auction.lot);
  if (!lot) throw notFound('lot not found');

  const bidder = await User.findById(bidderId);
  if (!bidder) throw notFound('bidder not found');
  if (bidder.role !== 'buyer') throw forbidden('only buyers can bid');
  if (auction.farmer.toString() === bidderId) throw forbidden('cannot bid on your own auction');

  const minRequired = Math.max(
    (auction.currentBidPerKg || 0) + MIN_INCREMENT,
    auction.basePricePerKg,
  );
  if (pricePerKg < minRequired) {
    throw badRequest(`bid must be at least ${minRequired} per kg`);
  }

  const totalAmount = pricePerKg * lot.weightKg;

  const totalHeld = await getHeldAmount(bidderId);
  let alreadyHeldOnThis = 0;
  if (auction.highestBidder?.toString() === bidderId) {
    alreadyHeldOnThis = (auction.currentBidPerKg || 0) * lot.weightKg;
  }
  const heldExcludingThis = totalHeld - alreadyHeldOnThis;
  const available = bidder.walletBalance - heldExcludingThis;
  if (totalAmount > available) {
    throw badRequest(`insufficient available balance. needed ${totalAmount}, available ${available}`);
  }

  // anti-snipe: if bid lands in the last 30s, extend endAt by 30s
  const now = Date.now();
  const remaining = auction.endAt.getTime() - now;
  const shouldExtend = remaining < ANTISNIPE_WINDOW_MS;
  const newEndAt = shouldExtend ? new Date(now + ANTISNIPE_EXTEND_MS) : auction.endAt;

  // atomic update: only succeeds if currentBidPerKg is still strictly less
  const update = {
    $set: {
      currentBidPerKg: pricePerKg,
      highestBidder: bidderId,
    },
    $inc: { bidCount: 1 },
  };
  if (shouldExtend) update.$set.endAt = newEndAt;

  const updated = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      status: 'live',
      endAt: { $gt: new Date() },
      currentBidPerKg: { $lt: pricePerKg },
    },
    update,
    { new: true },
  );
  if (!updated) throw badRequest('bid rejected: outbid or auction closed');

  const bid = await Bid.create({
    auction: auctionId,
    bidder: bidderId,
    pricePerKg,
    amountTotal: totalAmount,
  });

  return { auction: updated, bid, extended: shouldExtend };
}