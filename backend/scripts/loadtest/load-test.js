/**
 * Areca Auction — WebSocket Bid Latency Load Test
 * Measures bid-to-broadcast latency under increasing concurrency.
 */

import { io } from 'socket.io-client';
import { writeFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; })
);

const URL        = args.url       || 'http://localhost:8000';
const AUCTION_ID = args.auctionId || process.env.AUCTION_ID;
const TOKEN      = args.token     || process.env.BUYER_TOKEN;
const LEVELS     = (args.levels   || '10,50,100,200,500').split(',').map(Number);
const BID_BASE   = Number(args.bidBase || 400);
const TIMEOUT_MS = Number(args.timeout || 15000);

if (!AUCTION_ID || !TOKEN) {
  console.error('ERROR: --auctionId and --token are required');
  process.exit(1);
}

function mean(arr)   { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}
function pct(sorted, p) {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}
function stats(latencies) {
  if (!latencies.length) return null;
  const s = [...latencies].sort((a, b) => a - b);
  return {
    n:      s.length,
    mean:   +mean(s).toFixed(2),
    stddev: +stddev(s).toFixed(2),
    min:    s[0],
    p50:    pct(s, 50),
    p95:    pct(s, 95),
    p99:    pct(s, 99),
    max:    s[s.length - 1],
  };
}

function runClient(clientId, pricePerKg) {
  return new Promise((resolve) => {
    const result = { clientId, latencyMs: null, error: null };
    let sentAt   = null;
    let done     = false;

    const finish = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.disconnect(); } catch {}
      resolve(r);
    };

    const socket = io(URL, {
      auth:         { token: TOKEN },
      transports:   ['websocket'],
      reconnection: false,
      timeout:      TIMEOUT_MS,
    });

    const timer = setTimeout(() => {
      result.error = 'timeout';
      finish(result);
    }, TIMEOUT_MS);

    socket.on('connect', () => {
      // join the auction room first, then immediately place bid
      socket.emit('auction:join', AUCTION_ID);
      // small delay to let the server process the join before bid
      setTimeout(() => {
        sentAt = Date.now();
        socket.emit('bid:place', { auctionId: AUCTION_ID, pricePerKg }, (ack) => {
          if (ack && !ack.ok) {
            result.error = ack.error || 'bid rejected';
            finish(result);
          }
          // if ok, wait for bid:new broadcast to measure full round-trip
        });
      }, 50);
    });

    socket.on('bid:new', (e) => {
      if (e.auctionId !== AUCTION_ID) return;
      if (sentAt !== null && result.latencyMs === null) {
        result.latencyMs = Date.now() - sentAt;
        finish(result);
      }
    });

    socket.on('connect_error', (err) => {
      result.error = `connect_error: ${err.message}`;
      finish(result);
    });

    socket.on('disconnect', () => {
      if (!done) {
        result.error = 'disconnected early';
        finish(result);
      }
    });
  });
}

async function runLevel(concurrency) {
  const promises = Array.from({ length: concurrency }, (_, i) =>
    new Promise(res =>
      setTimeout(() => runClient(i, BID_BASE + i).then(res), i * 10)
    )
  );

  const wallStart = Date.now();
  const results   = await Promise.all(promises);
  const wallMs    = Date.now() - wallStart;

  const latencies = results.filter(r => r.latencyMs !== null).map(r => r.latencyMs);
  const errors    = results.filter(r => r.error !== null);
  const tput      = latencies.length
    ? +((latencies.length / wallMs) * 1000).toFixed(2)
    : 0;

  return {
    concurrency,
    successful: latencies.length,
    failed:     errors.length,
    throughputBidsPerSec: tput,
    wallMs,
    latencyStats: stats(latencies),
    errorSample:  [...new Set(errors.slice(0, 5).map(e => e.error))],
  };
}

async function main() {
  console.log(`\nAreca Auction — Bid Latency Load Test`);
  console.log(`URL: ${URL}  |  Auction: ${AUCTION_ID}`);
  console.log(`Levels: ${LEVELS.join(', ')} concurrent clients\n`);

  const results = [];

  for (const level of LEVELS) {
    process.stdout.write(`Running level ${level}... `);
    const r = await runLevel(level);
    results.push(r);
    const ok = r.successful === r.concurrency ? '✓' : `⚠ ${r.failed} failed`;
    process.stdout.write(`done (${r.successful}/${level} ok) ${ok}\n`);
    if (r.errorSample.length) console.log(`  errors: ${r.errorSample.join(', ')}`);
    if (level !== LEVELS[LEVELS.length - 1]) await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n' + '═'.repeat(82));
  console.log('  RESULTS — Bid-to-Broadcast Latency (ms)');
  console.log('═'.repeat(82));
  console.log(
    'Users'.padEnd(8), 'OK'.padEnd(6), 'Fail'.padEnd(6),
    'Tput/s'.padEnd(8), 'Mean'.padEnd(8), '±StdDev'.padEnd(10),
    'p50'.padEnd(7), 'p95'.padEnd(7), 'p99'.padEnd(7), 'Max'.padEnd(7),
  );
  console.log('─'.repeat(82));

  for (const r of results) {
    const s = r.latencyStats;
    if (!s) {
      console.log(`${String(r.concurrency).padEnd(8)} ALL FAILED — ${r.errorSample[0] || 'unknown'}`);
      continue;
    }
    console.log(
      String(r.concurrency).padEnd(8),
      String(r.successful).padEnd(6),
      String(r.failed).padEnd(6),
      String(r.throughputBidsPerSec).padEnd(8),
      String(s.mean).padEnd(8),
      `±${s.stddev}`.padEnd(10),
      String(s.p50).padEnd(7),
      String(s.p95).padEnd(7),
      String(s.p99).padEnd(7),
      String(s.max).padEnd(7),
    );
  }
  console.log('═'.repeat(82));

  const outPath = `load-test-results-${Date.now()}.json`;
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved: ${outPath}`);
  console.log('\nFor paper Table II (mean ± std dev):');
  results.forEach(r => {
    const s = r.latencyStats;
    if (s) console.log(`  ${r.concurrency} users: ${s.mean} ± ${s.stddev} ms  (p95=${s.p95} ms, p99=${s.p99} ms, tput=${r.throughputBidsPerSec} bids/s)`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
