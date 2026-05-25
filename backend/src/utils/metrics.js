import client from 'prom-client';

// register once at module load — singleton.
// includes default node.js process metrics (cpu, memory, event loop lag, gc).
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'areca_' });

// http metrics — labels keep cardinality low (route templates, not full paths)
export const httpRequestsTotal = new client.Counter({
  name: 'areca_http_requests_total',
  help: 'count of http requests by method, route, and status code',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'areca_http_request_duration_seconds',
  help: 'http request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// business metrics
export const bidsPlacedTotal = new client.Counter({
  name: 'areca_bids_placed_total',
  help: 'count of successful bids placed',
  registers: [register],
});

export const auctionsSettledTotal = new client.Counter({
  name: 'areca_auctions_settled_total',
  help: 'count of auctions settled by outcome',
  labelNames: ['outcome'], // 'sold' | 'cancelled' (+ reason as separate label avoids cardinality blowup)
  registers: [register],
});

export const auctionSettleFailureReasonTotal = new client.Counter({
  name: 'areca_auction_settle_failure_reason_total',
  help: 'count of settlement failures by reason',
  labelNames: ['reason'],
  registers: [register],
});

export const activeAuctions = new client.Gauge({
  name: 'areca_active_auctions',
  help: 'current number of live auctions',
  registers: [register],
});

// exposed for the /metrics endpoint
export { register };
