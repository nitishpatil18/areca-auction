import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import Auction from '../src/models/Auction.js';
import { settleAndClose } from '../src/services/auctionService.js';

let app;
beforeAll(() => { app = createApp(); });

async function reg(role = 'farmer', balance = 0) {
  const email = `u-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User', email, password: 'test1234', role,
  });
  if (balance > 0) {
    await User.findByIdAndUpdate(res.body.user.id, { walletBalance: balance });
  }
  return { token: res.body.token, user: res.body.user };
}

async function createLot(token, overrides = {}) {
  const lot = {
    variety: 'Rashi',
    grade: 'B',
    weightKg: 100,
    basePricePerKg: 300,
    moisturePct: 8,
    region: 'Shivamogga',
    ...overrides,
  };
  const res = await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send(lot);
  expect(res.status).toBe(201);
  return res.body.lot;
}

async function startAuction(token, lotId, durationMs = 60_000) {
  const now = Date.now();
  const res = await request(app)
    .post('/api/auctions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      lotId,
      startAt: new Date(now - 1000).toISOString(),
      endAt: new Date(now + durationMs).toISOString(),
    });
  expect(res.status).toBe(201);
  // creating an auction sets it 'scheduled'; the scheduler job promotes it to 'live'.
  // since we test routes here (not the scheduler), patch directly to 'live'.
  await Auction.findByIdAndUpdate(res.body.auction._id, { status: 'live' });
  return { ...res.body.auction, status: 'live' };
}

describe('POST /api/auctions (farmer-only)', () => {
  it('creates auction for own lot', async () => {
    const farmer = await reg('farmer');
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);
    expect(auction.lot).toBe(lot._id);
    expect(auction.status).toBe('live');
  });

  it('rejects creating auction without auth (401)', async () => {
    const res = await request(app).post('/api/auctions').send({
      lotId: '6a1030fed20db1498bfc0000',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(res.status).toBe(401);
  });

  it('rejects buyer creating auction (403)', async () => {
    const buyer = await reg('buyer');
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        lotId: '6a1030fed20db1498bfc0000',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60_000).toISOString(),
      });
    expect(res.status).toBe(403);
  });

  it('rejects invalid lotId format (400)', async () => {
    const farmer = await reg('farmer');
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        lotId: 'not-an-id',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60_000).toISOString(),
      });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auctions/:id/bids', () => {
  it('places a valid bid (200)', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: 350 });

    expect(res.status).toBe(201);
    expect(res.body.bid.pricePerKg).toBe(350);
  });

  it('rejects bid below current price (400)', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: 250 });  // below base

    expect(res.status).toBe(400);
  });

  it('rejects bid from buyer with insufficient balance (400)', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 100);  // tiny balance
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: 350 });  // 350 * 100kg = 35,000 needed

    expect(res.status).toBe(400);
  });

  it('rejects bid from farmer (403)', async () => {
    const farmer = await reg('farmer');
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ pricePerKg: 400 });

    expect(res.status).toBe(403);
  });

  it('rejects bid without auth (401)', async () => {
    const farmer = await reg('farmer');
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .send({ pricePerKg: 350 });

    expect(res.status).toBe(401);
  });

  it('rejects negative pricePerKg (400)', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: -100 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auctions/:id/bids', () => {
  it('returns bid history sorted newest-first', async () => {
    const farmer = await reg('farmer');
    const buyer1 = await reg('buyer', 50_000);
    const buyer2 = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    await request(app).post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer1.token}`)
      .send({ pricePerKg: 350 }).expect(201);
    await request(app).post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer2.token}`)
      .send({ pricePerKg: 400 }).expect(201);

    const res = await request(app).get(`/api/auctions/${auction._id}/bids`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].pricePerKg).toBe(400);
    expect(res.body.items[1].pricePerKg).toBe(350);
  });

  it('returns empty list for an auction with no bids', async () => {
    const farmer = await reg('farmer');
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const res = await request(app).get(`/api/auctions/${auction._id}/bids`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

describe('full lifecycle: create → bid → settle', () => {
  it('settles correctly: winner pays, farmer receives, lot sold', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token, { weightKg: 100, basePricePerKg: 300 });
    const auction = await startAuction(farmer.token, lot._id);

    await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: 350 })
      .expect(201);

    // settle directly (bypass scheduler for test)
    const settled = await settleAndClose(auction._id);
    expect(settled.status).toBe('closed');
    expect(settled.finalAmount).toBe(35_000);  // 350 * 100kg

    const buyerAfter = await User.findById(buyer.user.id);
    const farmerAfter = await User.findById(farmer.user.id);
    expect(buyerAfter.walletBalance).toBe(15_000);  // 50000 - 35000
    expect(farmerAfter.walletBalance).toBe(35_000);
  });

  it('cancels with no_bids reason when no bids placed', async () => {
    const farmer = await reg('farmer');
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    const settled = await settleAndClose(auction._id);
    expect(settled.status).toBe('cancelled');
    expect(settled.settlementFailureReason).toBe('no_bids');
  });
});

describe('GET /api/auctions/my/bids (buyer)', () => {
  it('returns auctions the buyer has bid on', async () => {
    const farmer = await reg('farmer');
    const buyer = await reg('buyer', 50_000);
    const lot = await createLot(farmer.token);
    const auction = await startAuction(farmer.token, lot._id);

    await request(app).post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ pricePerKg: 350 }).expect(201);

    const res = await request(app)
      .get('/api/auctions/my/bids')
      .set('Authorization', `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for a buyer with no bids', async () => {
    const buyer = await reg('buyer', 50_000);
    const res = await request(app)
      .get('/api/auctions/my/bids')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});
