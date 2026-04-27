import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { attachSocket } from './sockets/auctionSocket.js';
import { startAuctionCloser } from './jobs/auctionCloser.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 8000;

async function bootstrap() {
  await connectDB(process.env.MONGO_URI);

  const { initChain } = await import('./services/chainService.js');
  await initChain();

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  app.set('io', io);

  attachSocket(io);
  startAuctionCloser(io);

  httpServer.listen(PORT, () => {
    logger.info(`server listening on http://localhost:${PORT}`);
    logger.info(`demo page at  http://localhost:${PORT}/auction.html`);
  });

  const shutdown = (sig) => {
    logger.warn(`${sig} received, shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (e) => logger.error('unhandledRejection: ' + e));
  process.on('uncaughtException', (e) => logger.error('uncaughtException: ' + e.stack));
}

bootstrap().catch((e) => {
  logger.error('bootstrap failed: ' + e.message);
  process.exit(1);
});