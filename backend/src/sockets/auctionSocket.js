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

  // revalidate JWT on all active connections every 5 minutes.
  // if the token has expired since the initial handshake, disconnect the socket.
  // TOKEN_REVALIDATION: prevents indefinitely-alive sockets after token expiry.
  const REVALIDATE_INTERVAL_MS = Number(process.env.SOCKET_REVALIDATE_MS || 5 * 60_000);

  io.on('connection', (socket) => {
    logger.debug(`socket connected: ${socket.id} user=${socket.user?.id}`);
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    // periodic JWT expiry check
    const revalidateTimer = setInterval(() => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('no token');
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        logger.info(`socket ${socket.id} disconnected: token expired or invalid`);
        socket.emit('auth:expired', { message: 'session expired, please log in again' });
        socket.disconnect(true);
      }
    }, REVALIDATE_INTERVAL_MS);

    // clean up timer on disconnect to prevent memory leak
    socket.on('disconnect', () => {
      clearInterval(revalidateTimer);
    });

    socket.on('auction:join', (auctionId) => {
      if (typeof auctionId === 'string') socket.join(`auction:${auctionId}`);
    });

    socket.on('auction:leave', (auctionId) => {
      if (typeof auctionId === 'string') socket.leave(`auction:${auctionId}`);
    });

    socket.on('bid:place', async (payload, cb) => {
      // latency tracking: measure time from bid received to broadcast emitted.
      const bidStart = Date.now();
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

        const processingMs = Date.now() - bidStart;
        logger.info({
          msg: 'bid processed',
          auctionId,
          pricePerKg,
          processingMs,
          extended,
          bidCount: auction.bidCount,
        });
        cb?.({ ok: true, processingMs });
      } catch (e) {
        const processingMs = Date.now() - bidStart;
        logger.warn({ msg: 'bid rejected', error: e.message, processingMs });
        cb?.({ ok: false, error: e.message });
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`socket disconnected: ${socket.id}`);
    });
  });
}