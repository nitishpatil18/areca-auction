import Auction from '../models/Auction.js';
import * as auctionService from '../services/auctionService.js';
import { logger } from '../utils/logger.js';

let timer = null;

export function startAuctionCloser(io) {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const now = new Date();

      const dueToStart = await Auction.find({
        status: 'scheduled', startAt: { $lte: now },
      }).limit(20).select('_id');

      for (const a of dueToStart) {
        const updated = await auctionService.transitionToLive(a._id);
        if (updated) {
          io?.to(`auction:${updated._id}`).emit('auction:started', {
            auctionId: updated._id.toString(),
            endAt: updated.endAt,
          });
          logger.info(`auction ${updated._id} now live`);
        }
      }

      const dueToEnd = await Auction.find({
        status: 'live', endAt: { $lte: now },
      }).limit(20).select('_id');

      for (const a of dueToEnd) {
        const closed = await auctionService.settleAndClose(a._id);
        if (closed) {
          io?.to(`auction:${closed._id}`).emit('auction:closed', {
            auctionId: closed._id.toString(),
            winner: closed.highestBidder?.toString() || null,
            finalPricePerKg: closed.currentBidPerKg,
            finalAmount: closed.finalAmount || 0,
          });
          logger.info(`auction ${closed._id} closed, winner=${closed.highestBidder} amount=${closed.finalAmount}`);
        }
      }
    } catch (e) {
      logger.error('auctionCloser error: ' + e.message);
    }
  }, 1000);
}

export function stopAuctionCloser() {
  if (timer) clearInterval(timer);
  timer = null;
}