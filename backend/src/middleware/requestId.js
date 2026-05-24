import { randomUUID } from 'node:crypto';

// stamp every request with a short id so log lines for the same request can be grouped.
// honors incoming X-Request-Id header so external systems (load balancers, clients) can
// propagate their own ids if they want.
export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.id = incoming || randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.id);
  next();
}
