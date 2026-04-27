import { logger } from '../utils/logger.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'route not found', path: req.originalUrl });
}

// must take 4 args for express to recognize it as error middleware
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'validation failed', details: err.errors });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'duplicate key', details: err.keyValue });
  }
  logger.error(err.stack || err.message);
  res.status(500).json({ error: 'internal server error' });
}