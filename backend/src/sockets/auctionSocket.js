import jwt from 'jsonwebtoken';
import * as bidService from '../services/bidService.js';
import * as notificationService from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

export function attachSocket(io) {
  notificationService.attachIO(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized: no token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`socket connected: ${socket.id} user=${socket.user?.id}`);
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    socket.on('auction:join', (auctionId) => {
      if (typeof auctionId === 'string') socket.join(`auction:${auctionId}`);
    });

    socket.on('auction:leave', (auctionId) => {
      if (typeof auctionId === 'string') socket.leave(`auction:${auctionId}`);
    });

    socket.on('bid:place', async (payload, cb) => {
      try {
        const auctionId = payload?.auctionId;
        const pricePerKg = Number(payload?.pricePerKg);
        if (socket.user.role !== 'buyer') throw new Error('only buyers can bid');

        const { auction, bid, extended } = await bidService.placeBid({
          auctionId, bidderId: socket.user.id, pricePerKg,
        });

        io.to(`auction:${auctionId}`).emit('bid:new', {
          auctionId,
          pricePerKg: auction.currentBidPerKg,
          highestBidder: auction.highestBidder?.toString() || null,
          bidCount: auction.bidCount,
          at: bid.createdAt,
        });

        if (extended) {
          io.to(`auction:${auctionId}`).emit('auction:extended', {
            auctionId,
            endAt: auction.endAt,
          });
        }

        cb?.({ ok: true });
      } catch (e) {
        cb?.({ ok: false, error: e.message });
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`socket disconnected: ${socket.id}`);
    });
  });
}