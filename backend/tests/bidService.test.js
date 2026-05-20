import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { placeBid } from '../src/services/bidService.js';
import User from '../src/models/User.js';
import Lot from '../src/models/Lot.js';
import Auction from '../src/models/Auction.js';
import Bid from '../src/models/Bid.js';

// ----- helpers -------------------------------------------------------------

async function makeUser(role = 'buyer', walletBalance = 1_000_000) {
  return User.create({
    name: role,
    email: `${role}${Math.random().toString(36).slice(2, 10)}@test.com`,
    passwordHash: 'x',
    role,
    walletBalance,
  });
}

async function makeLot(farmerId, overrides = {}) {
  return Lot.create({
    farmer: farmerId,
    variety: 'Bette',
    grade: 'A',
    weightKg: 100,
    basePricePerKg: 50,
    region: 'Shivamogga',
    status: 'in_auction',
    ...overrides,
  });
}

async function makeAuction(lotId, farmerId, overrides = {}) {
  return Auction.create({
    lot: lotId,
    farmer: farmerId,
    status: 'live',
    startAt: new Date(Date.now() - 60_000),
    endAt: new Date(Date.now() + 60_000),
    basePricePerKg: 50,
    currentBidPerKg: 0,
    highestBidder: null,
    bidCount: 0,
    ...overrides,
  });
}

async function setup({ basePricePerKg = 50, currentBidPerKg = 0, weightKg = 100, walletBalance = 1_000_000 } = {}) {
  const farmer = await makeUser('farmer');
  const buyer = await makeUser('buyer', walletBalance);
  const lot = await makeLot(farmer._id, { basePricePerKg, weightKg });
  const auction = await makeAuction(lot._id, farmer._id, { basePricePerKg, currentBidPerKg });
  return {
    farmer,
    buyer,
    lot,
    auction,
    farmerId: farmer._id.toString(),
    buyerId: buyer._id.toString(),
    auctionId: auction._id.toString(),
  };
}

// ----- input validation ----------------------------------------------------

describe('bidService.placeBid input validation', () => {
  it('rejects a non-positive pricePerKg', async () => {
    const { auctionId, buyerId } = await setup();
    await expect(
      placeBid({ auctionId, bidderId: buyerId, pricePerKg: 0 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a non-numeric pricePerKg', async () => {
    const { auctionId, buyerId } = await setup();
    await expect(
      placeBid({ auctionId, bidderId: buyerId, pricePerKg: 'abc' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when the auction does not exist', async () => {
    const buyer = await makeUser('buyer');
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      placeBid({ auctionId: fakeId, bidderId: buyer._id.toString(), pricePerKg: 100 })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws 404 when the bidder does not exist', async () => {
    const { auctionId } = await setup();
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      placeBid({ auctionId, bidderId: fakeId, pricePerKg: 100 })
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ----- authorization -------------------------------------------------------

describe('bidService.placeBid authorization', () => {
  it('forbids the farmer (non-buyer role) from bidding', async () => {
    const { auctionId, farmerId } = await setup();
    await expect(
      placeBid({ auctionId, bidderId: farmerId, pricePerKg: 100 })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('forbids non-buyers (e.g. admin) from bidding', async () => {
    const { auctionId } = await setup();
    const admin = await makeUser('admin');
    await expect(
      placeBid({ auctionId, bidderId: admin._id.toString(), pricePerKg: 100 })
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ----- auction lifecycle ---------------------------------------------------

describe('bidService.placeBid lifecycle', () => {
  it('rejects bidding on a scheduled (not live) auction', async () => {
    const farmer = await makeUser('farmer');
    const buyer = await makeUser('buyer');
    const lot = await makeLot(farmer._id);
    const auction = await makeAuction(lot._id, farmer._id, { status: 'scheduled' });
    await expect(
      placeBid({
        auctionId: auction._id.toString(),
        bidderId: buyer._id.toString(),
        pricePerKg: 100,
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects bidding when endAt has already passed', async () => {
    const farmer = await makeUser('farmer');
    const buyer = await makeUser('buyer');
    const lot = await makeLot(farmer._id);
    const auction = await makeAuction(lot._id, farmer._id, {
      startAt: new Date(Date.now() - 120_000),
      endAt:   new Date(Date.now() - 1_000),
    });
    await expect(
      placeBid({
        auctionId: auction._id.toString(),
        bidderId: buyer._id.toString(),
        pricePerKg: 100,
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ----- minimum bid rules ---------------------------------------------------

describe('bidService.placeBid minimum bid', () => {
  it('rejects a first bid below base price', async () => {
    const { auctionId, buyerId } = await setup({ basePricePerKg: 50 });
    await expect(
      placeBid({ auctionId, bidderId: buyerId, pricePerKg: 49 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a bid that does not beat current + min increment', async () => {
    const { auctionId, buyerId } = await setup({ currentBidPerKg: 60 });
    await expect(
      placeBid({ auctionId, bidderId: buyerId, pricePerKg: 60 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts a valid first bid at exactly base price', async () => {
    const { auctionId, buyerId } = await setup({ basePricePerKg: 50 });
    const result = await placeBid({ auctionId, bidderId: buyerId, pricePerKg: 50 });
    expect(result.auction.currentBidPerKg).toBe(50);
    expect(result.auction.bidCount).toBe(1);
    expect(result.bid.amountTotal).toBe(50 * 100);
  });
});

// ----- wallet checks -------------------------------------------------------

describe('bidService.placeBid wallet', () => {
  it('rejects when wallet has insufficient available balance', async () => {
    const { auctionId, buyerId } = await setup({ walletBalance: 1000, weightKg: 100 });
    await expect(
      placeBid({ auctionId, bidderId: buyerId, pricePerKg: 50 })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('allows a user to outbid themselves: old hold is released before computing available', async () => {
    const { auctionId, buyerId } = await setup({ walletBalance: 6000 });
    await placeBid({ auctionId, bidderId: buyerId, pricePerKg: 50 });
    const result = await placeBid({ auctionId, bidderId: buyerId, pricePerKg: 55 });
    expect(result.auction.currentBidPerKg).toBe(55);
    expect(result.auction.bidCount).toBe(2);
  });
});

// ----- anti-snipe ----------------------------------------------------------

describe('bidService.placeBid anti-snipe', () => {
  it('extends endAt by ANTISNIPE_EXTEND_MS when bid lands inside the window', async () => {
    const farmer = await makeUser('farmer');
    const buyer  = await makeUser('buyer');
    const lot    = await makeLot(farmer._id);

    const endAt = new Date(Date.now() + 2_000);
    const auction = await makeAuction(lot._id, farmer._id, { endAt });

    const result = await placeBid({
      auctionId: auction._id.toString(),
      bidderId: buyer._id.toString(),
      pricePerKg: 60,
    });

    expect(result.extended).toBe(true);
    expect(result.auction.endAt.getTime()).toBeGreaterThan(endAt.getTime());
  });

  it('does not extend endAt when bid lands well before the window', async () => {
    const { auctionId, buyerId, auction } = await setup();
    const originalEnd = auction.endAt.getTime();

    const result = await placeBid({ auctionId, bidderId: buyerId, pricePerKg: 60 });

    expect(result.extended).toBe(false);
    expect(result.auction.endAt.getTime()).toBe(originalEnd);
  });
});

// ----- persistence ---------------------------------------------------------

describe('bidService.placeBid persistence', () => {
  it('writes a Bid document and updates the Auction atomically', async () => {
    const { auctionId, buyerId } = await setup();
    await placeBid({ auctionId, bidderId: buyerId, pricePerKg: 75 });

    const bids = await Bid.find({ auction: auctionId });
    expect(bids).toHaveLength(1);
    expect(bids[0].pricePerKg).toBe(75);
    expect(bids[0].amountTotal).toBe(75 * 100);
    expect(bids[0].bidder.toString()).toBe(buyerId);

    const after = await Auction.findById(auctionId);
    expect(after.currentBidPerKg).toBe(75);
    expect(after.highestBidder.toString()).toBe(buyerId);
    expect(after.bidCount).toBe(1);
  });
});
