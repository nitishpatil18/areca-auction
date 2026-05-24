import { logger } from '../utils/logger.js';

// emits one structured log line per http request when the response finishes.
// must be mounted AFTER requestId middleware so req.id is available.
export function requestLogger(req, res, next) {
  const startNs = process.hrtime.bigint();
  // capture before routing rewrites req.path; originalUrl is stable
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;

    // skip health checks in production logs to reduce noise; keep them in dev.
    if (process.env.NODE_ENV === 'production' && path === '/health') return;

    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('http', {
      requestId: req.id,
      method:    req.method,
      path,
      status:    res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip:        req.ip,
      ua:        req.get('user-agent'),
      userId:    req.user?.id || null,
    });
  });

  next();
}
