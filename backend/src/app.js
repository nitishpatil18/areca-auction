import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import lotRoutes from './routes/lot.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationRoutes from './routes/notification.routes.js';

import { notFoundHandler, errorHandler } from './middleware/error.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { register as metricsRegister, activeAuctions } from './utils/metrics.js';
import Auction from './models/Auction.js';

export function createApp() {
  const app = express();
  app.set('etag', false);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(requestId);
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 100_000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get('/metrics', async (req, res) => {
    // refresh gauges before scraping
    const live = await Auction.countDocuments({ status: 'live' });
    activeAuctions.set(live);
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  });

  app.use(express.static('public'));
  app.use('/uploads', express.static('/app/uploads', {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api/lots', lotRoutes);
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}