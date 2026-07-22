/**
 * Automatic runner for the Areca Auction load test.
 * Handles: login as admin, create farmer + buyer accounts,
 * create lot, schedule auction, wait for it to go live,
 * then run the load test at specified concurrency levels.
 *
 * Usage:
 *   node backend/scripts/loadtest/load-test-runner.js
 *   node backend/scripts/loadtest/load-test-runner.js --levels 10,50,100
 *   node backend/scripts/loadtest/load-test-runner.js --url http://localhost:8000
 */

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; })
);

const BASE_URL = args.url    || 'http://localhost:8000';
const LEVELS   = args.levels || '10,50,100,200,500';

async function post(path, body, token) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function get(path, token) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Areca Auction Load Test Runner ===\n');

  // 1. login as existing farmer and buyer from seed
  console.log('Step 1: Logging in with seed accounts...');
  const farmerLogin = await post('/auth/login', { email: 'ravi@demo.com', password: 'demo1234' });
  const buyerLogin  = await post('/auth/login', { email: 'arun@demo.com', password: 'demo1234' });
  const farmerToken = farmerLogin.token;
  const buyerToken  = buyerLogin.token;
  console.log('  Farmer: ravi@demo.com ✓');
  console.log('  Buyer:  arun@demo.com ✓');

  // 2. top up buyer wallet so bids don't fail balance check
  console.log('\nStep 2: Topping up buyer wallet...');
  await post('/wallet/topup', { amount: 9999999 }, buyerToken);
  console.log('  Topped up ₹9,999,999 ✓');

  // 3. create a fresh lot
  console.log('\nStep 3: Creating test lot...');
  const lotRes = await post('/lots', {
    variety: 'Bette',
    grade: 'A',
    weightKg: 100,
    basePricePerKg: 350,
    region: 'Shivamogga',
    description: 'Load test lot — auto-created',
  }, farmerToken);
  const lotId = lotRes.lot._id;
  console.log(`  Lot created: ${lotId} ✓`);

  // 4. schedule auction to start in 15 seconds
  console.log('\nStep 4: Scheduling auction (starts in 15s)...');
  const now = Date.now();
  const startAt = new Date(now + 15_000).toISOString();
  const endAt   = new Date(now + 15_000 + 10 * 60_000).toISOString(); // 10 min duration
  const aucRes = await post('/auctions', { lotId, startAt, endAt }, farmerToken);
  const auctionId = aucRes.auction._id;
  console.log(`  Auction created: ${auctionId}`);
  console.log('  Waiting 20s for auction to go live...');

  // 5. wait for auction to be promoted to live by scheduler
  await sleep(20_000);

  // 6. verify it's live
  const aucData = await get(`/auctions/${auctionId}`, buyerToken);
  if (aucData.auction.status !== 'live') {
    console.error(`  ERROR: Auction status is '${aucData.auction.status}', expected 'live'`);
    console.error('  Make sure the backend scheduler is running.');
    process.exit(1);
  }
  console.log('  Auction is LIVE ✓');

  // 7. run load test
  console.log(`\nStep 5: Running load test at levels: ${LEVELS}\n`);
  const { spawnSync } = await import('child_process');
  const result = spawnSync('node', [
    '--experimental-vm-modules',
    'backend/scripts/loadtest/load-test.js',
    `--url=${BASE_URL}`,
    `--auctionId=${auctionId}`,
    `--token=${buyerToken}`,
    `--levels=${LEVELS}`,
    '--bidBase=360',
  ], { stdio: 'inherit', cwd: process.cwd() });

  if (result.status !== 0) {
    console.error('Load test exited with error');
    process.exit(result.status);
  }
}

main().catch(e => { console.error('\nRunner failed:', e.message); process.exit(1); });
