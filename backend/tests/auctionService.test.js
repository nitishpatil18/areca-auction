import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  createAuction,
} from '../src/services/auctionService.js';
import User from '../src/models/User.js';
import Lot from '../src/models/Lot.js';
import Auction from '../src/models/Auction.js';
import * as chainService from '../src/services/chainService.js';

// ----- helpers -------------------------------------------------------------

async function makeUser(role = 'farmer', overrides = {}) {
  return User.create({
    name: role,
    email: `${role}${Math.random().toString(36).slice(2, 10)}@test.com`,
    passwordHash: 'x',
    role,
    walletBalance: 0,
    ...overrides,
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
    status: 'listed',
    ...overrides,
  });
}

function futureDates({ startInSec = 60, durationSec = 300 } = {}) {
  const start = new Date(Date.now() + startInSec * 1000);
  const end = new Date(start.getTime() + durationSec * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ----- createAuction: validation -------------------------------------------

describe('auctionService.createAuction validation', () => {
  it('throws 404 when the lot does not exist', async () => {
    const farmer = await makeUser('farmer');
    const fakeLotId = new mongoose.Types.ObjectId().toString();
    await expect(
      createAuction({ farmerId: farmer._id.toString(), lotId: fakeLotId, ...futureDates() })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 when the lot belongs to a different farmer', async () => {
    const owner = await makeUser('farmer');
    const other = await makeUser('farmer');
    const lot = await makeLot(owner._id);
    await expect(
      createAuction({
        farmerId: other._id.toString(),
        lotId: lot._id.toString(),
        ...futureDates(),
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('throws 400 when the lot is not in listed status', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id, { status: 'draft' });
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        ...futureDates(),
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when dates are invalid (NaN)', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        startAt: 'not-a-date',
        endAt: 'also-not-a-date',
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when endAt is not strictly after startAt', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);
    const start = new Date(Date.now() + 60_000);
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        startAt: start.toISOString(),
        endAt: start.toISOString(), // same instant
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when startAt is more than 60s in the past', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);
    const start = new Date(Date.now() - 120_000); // 2 minutes ago
    const end = new Date(start.getTime() + 300_000);
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when duration is below MIN_DURATION_MS (30s)', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);
    const start = new Date(Date.now() + 60_000);
    const end = new Date(start.getTime() + 10_000); // 10s duration
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when an auction already exists for the lot', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);
    await Auction.create({
      lot: lot._id,
      farmer: farmer._id,
      status: 'scheduled',
      startAt: new Date(Date.now() + 60_000),
      endAt: new Date(Date.now() + 360_000),
      basePricePerKg: 50,
    });
    await expect(
      createAuction({
        farmerId: farmer._id.toString(),
        lotId: lot._id.toString(),
        ...futureDates(),
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ----- createAuction: happy paths + chain behavior ------------------------

describe('auctionService.createAuction happy paths', () => {
  it('creates a scheduled auction and flips the lot to in_auction', async () => {
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id, { basePricePerKg: 75 });

    const auction = await createAuction({
      farmerId: farmer._id.toString(),
      lotId: lot._id.toString(),
      ...futureDates(),
    });

    expect(auction.status).toBe('scheduled');
    expect(auction.basePricePerKg).toBe(75);
    expect(auction.farmer.toString()).toBe(farmer._id.toString());
    expect(auction.lot.toString()).toBe(lot._id.toString());

    const lotAfter = await Lot.findById(lot._id);
    expect(lotAfter.status).toBe('in_auction');
  });

  it('leaves onChainAuctionId/createTxHash null when chain is disabled', async () => {
    // chain not initialised in test env, so createOnChainAuction returns null naturally
    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);

    const auction = await createAuction({
      farmerId: farmer._id.toString(),
      lotId: lot._id.toString(),
      ...futureDates(),
    });

    expect(auction.onChainAuctionId).toBeNull();
    expect(auction.createTxHash).toBeNull();
  });

  it('fills onChainAuctionId and createTxHash when chain mirror succeeds', async () => {
    vi.spyOn(chainService, 'createOnChainAuction').mockResolvedValue({
      onChainAuctionId: 42,
      txHash: '0xabc123',
    });

    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);

    const auction = await createAuction({
      farmerId: farmer._id.toString(),
      lotId: lot._id.toString(),
      ...futureDates(),
    });

    expect(auction.onChainAuctionId).toBe(42);
    expect(auction.createTxHash).toBe('0xabc123');
  });

  it('still creates the auction off-chain when chain mirror throws', async () => {
    vi.spyOn(chainService, 'createOnChainAuction').mockRejectedValue(new Error('chain down'));

    const farmer = await makeUser('farmer');
    const lot = await makeLot(farmer._id);

    const auction = await createAuction({
      farmerId: farmer._id.toString(),
      lotId: lot._id.toString(),
      ...futureDates(),
    });

    expect(auction.status).toBe('scheduled');
    expect(auction.onChainAuctionId).toBeNull();
    expect(auction.createTxHash).toBeNull();
  });
});

// ----- imports for chunk 2 -------------------------------------------------
// (re-import at the top is enough, just adding the named exports we need)

import {
  listAuctions,
  getAuctionById,
  getBidHistory,
  cancelAuction,
  transitionToLive,
} from '../src/services/auctionService.js';
import Bid from '../src/models/Bid.js';

// shared helper to set up a scheduled auction + lot + farmer for cancel tests
async function scheduledAuctionFixture(overrides = {}) {
  const farmer = await makeUser('farmer');
  const lot = await makeLot(farmer._id);
  const auction = await Auction.create({
    lot: lot._id,
    farmer: farmer._id,
    status: 'scheduled',
    startAt: new Date(Date.now() + 60_000),
    endAt: new Date(Date.now() + 360_000),
    basePricePerKg: lot.basePricePerKg,
    ...overrides,
  });
  // bring lot to in_auction since that's the post-create state
  lot.status = 'in_auction';
  await lot.save();
  return { farmer, lot, auction };
}

// ----- listAuctions --------------------------------------------------------

describe('auctionService.listAuctions', () => {
  it('returns auctions matching the filter with lot and farmer populated', async () => {
    const { auction } = await scheduledAuctionFixture();
    await scheduledAuctionFixture(); // another one, to verify filter

    const live = await listAuctions({ status: 'live' });
    expect(live).toHaveLength(0);

    const scheduled = await listAuctions({ status: 'scheduled' });
    expect(scheduled).toHaveLength(2);

    const one = scheduled.find((a) => a._id.toString() === auction._id.toString());
    expect(one.lot).toBeTruthy();
    expect(one.lot.weightKg).toBe(100); // populated, not just an id
    expect(one.farmer.name).toBe('farmer');
  });
});

// ----- getAuctionById ------------------------------------------------------

describe('auctionService.getAuctionById', () => {
  it('returns the auction with populations when it exists', async () => {
    const { auction } = await scheduledAuctionFixture();
    const result = await getAuctionById(auction._id);
    expect(result._id.toString()).toBe(auction._id.toString());
    expect(result.lot).toBeTruthy();
    expect(result.farmer.name).toBe('farmer');
  });

  it('throws 404 when the auction does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(getAuctionById(fakeId)).rejects.toMatchObject({ status: 404 });
  });
});

// ----- getBidHistory -------------------------------------------------------

describe('auctionService.getBidHistory', () => {
  it('returns bids in descending createdAt order with bidder populated', async () => {
    const { auction } = await scheduledAuctionFixture();
    const buyer = await makeUser('buyer');

    // insert with explicit createdAt to make ordering deterministic
    await Bid.create([
      { auction: auction._id, bidder: buyer._id, pricePerKg: 60, amountTotal: 6000, createdAt: new Date(Date.now() - 2000) },
      { auction: auction._id, bidder: buyer._id, pricePerKg: 70, amountTotal: 7000, createdAt: new Date(Date.now() - 1000) },
      { auction: auction._id, bidder: buyer._id, pricePerKg: 80, amountTotal: 8000, createdAt: new Date() },
    ]);

    const history = await getBidHistory(auction._id);
    expect(history).toHaveLength(3);
    expect(history[0].pricePerKg).toBe(80);
    expect(history[2].pricePerKg).toBe(60);
    expect(history[0].bidder.name).toBe('buyer');
  });

  it('respects the limit parameter', async () => {
    const { auction } = await scheduledAuctionFixture();
    const buyer = await makeUser('buyer');
    for (let i = 0; i < 5; i++) {
      await Bid.create({
        auction: auction._id, bidder: buyer._id,
        pricePerKg: 60 + i, amountTotal: (60 + i) * 100,
      });
    }
    const limited = await getBidHistory(auction._id, 2);
    expect(limited).toHaveLength(2);
  });

  it('returns an empty array when there are no bids', async () => {
    const { auction } = await scheduledAuctionFixture();
    const history = await getBidHistory(auction._id);
    expect(history).toEqual([]);
  });
});

// ----- cancelAuction -------------------------------------------------------

describe('auctionService.cancelAuction', () => {
  it('lets the farmer cancel their own scheduled auction and reverts the lot', async () => {
    const { farmer, lot, auction } = await scheduledAuctionFixture();

    const result = await cancelAuction({
      auctionId: auction._id,
      userId: farmer._id.toString(),
      role: 'farmer',
    });

    expect(result.status).toBe('cancelled');
    const lotAfter = await Lot.findById(lot._id);
    expect(lotAfter.status).toBe('listed');
  });

  it('lets an admin cancel any scheduled auction', async () => {
    const { auction } = await scheduledAuctionFixture();
    const admin = await makeUser('admin');

    const result = await cancelAuction({
      auctionId: auction._id,
      userId: admin._id.toString(),
      role: 'admin',
    });

    expect(result.status).toBe('cancelled');
  });

  it('forbids cancellation by a non-owner non-admin', async () => {
    const { auction } = await scheduledAuctionFixture();
    const stranger = await makeUser('farmer');

    await expect(
      cancelAuction({
        auctionId: auction._id,
        userId: stranger._id.toString(),
        role: 'farmer',
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('throws 400 when the auction is not scheduled (e.g. live)', async () => {
    const { farmer, auction } = await scheduledAuctionFixture();
    auction.status = 'live';
    await auction.save();

    await expect(
      cancelAuction({
        auctionId: auction._id,
        userId: farmer._id.toString(),
        role: 'farmer',
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when the auction does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(
      cancelAuction({ auctionId: fakeId, userId: 'irrelevant', role: 'farmer' })
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ----- transitionToLive ---------------------------------------------------

describe('auctionService.transitionToLive', () => {
  it('flips a scheduled auction whose startAt has passed to live', async () => {
    const { auction } = await scheduledAuctionFixture({
      startAt: new Date(Date.now() - 10_000),
      endAt:   new Date(Date.now() + 300_000),
    });
    const result = await transitionToLive(auction._id);
    expect(result.status).toBe('live');
  });

  it('returns null when startAt is still in the future', async () => {
    const { auction } = await scheduledAuctionFixture({
      startAt: new Date(Date.now() + 60_000),
      endAt:   new Date(Date.now() + 360_000),
    });
    const result = await transitionToLive(auction._id);
    expect(result).toBeNull();
  });

  it('returns null when the auction is not in scheduled status', async () => {
    const { auction } = await scheduledAuctionFixture({
      startAt: new Date(Date.now() - 10_000),
      endAt:   new Date(Date.now() + 300_000),
    });
    auction.status = 'live';
    await auction.save();
    const result = await transitionToLive(auction._id);
    expect(result).toBeNull();
  });
});

// ----- settleAndClose ------------------------------------------------------

import { settleAndClose } from '../src/services/auctionService.js';
import Transaction from '../src/models/Transaction.js';

async function liveAuctionFixture({
  weightKg = 100,
  currentBidPerKg = 80,
  winnerBalance = 1_000_000,
  farmerBalance = 0,
  hasWinner = true,
} = {}) {
  const farmer = await makeUser('farmer', { walletBalance: farmerBalance });
  const buyer = hasWinner ? await makeUser('buyer', { walletBalance: winnerBalance }) : null;
  const lot = await makeLot(farmer._id, { weightKg, basePricePerKg: 50, status: 'in_auction' });

  const auction = await Auction.create({
    lot: lot._id,
    farmer: farmer._id,
    status: 'live',
    startAt: new Date(Date.now() - 120_000),
    endAt: new Date(Date.now() - 1_000),
    basePricePerKg: 50,
    currentBidPerKg: hasWinner ? currentBidPerKg : 0,
    highestBidder: hasWinner ? buyer._id : null,
    bidCount: hasWinner ? 1 : 0,
  });

  return { farmer, buyer, lot, auction };
}

describe('auctionService.settleAndClose happy path', () => {
  it('moves funds from winner to farmer, writes two transactions, and marks lot sold', async () => {
    const { farmer, buyer, lot, auction } = await liveAuctionFixture({
      weightKg: 100, currentBidPerKg: 80, winnerBalance: 10_000, farmerBalance: 500,
    });

    const closed = await settleAndClose(auction._id);

    expect(closed.status).toBe('closed');
    expect(closed.finalAmount).toBe(8000);
    expect(closed.settledAt).toBeInstanceOf(Date);

    const buyerAfter = await User.findById(buyer._id);
    const farmerAfter = await User.findById(farmer._id);
    expect(buyerAfter.walletBalance).toBe(2_000);     // 10000 - 8000
    expect(farmerAfter.walletBalance).toBe(8_500);    // 500 + 8000

    const lotAfter = await Lot.findById(lot._id);
    expect(lotAfter.status).toBe('sold');

    const txs = await Transaction.find({ auction: auction._id }).sort({ amount: 1 });
    expect(txs).toHaveLength(2);
    // settlement debit (negative amount), payout (positive)
    expect(txs[0].type).toBe('auction_settlement');
    expect(txs[0].amount).toBe(-8000);
    expect(txs[0].user.toString()).toBe(buyer._id.toString());
    expect(txs[1].type).toBe('farmer_payout');
    expect(txs[1].amount).toBe(8000);
    expect(txs[1].user.toString()).toBe(farmer._id.toString());
  });
});

describe('auctionService.settleAndClose insufficient winner funds', () => {
  it('marks finalAmount=0, reverts lot to listed, leaves auction closed (current behavior)', async () => {
    // documents the dangling-state bug: closed auction + listed lot, no transactions written
    const { buyer, farmer, lot, auction } = await liveAuctionFixture({
      weightKg: 100, currentBidPerKg: 80, winnerBalance: 1000, // need 8000, have 1000
    });

    const closed = await settleAndClose(auction._id);

    expect(closed.status).toBe('closed');
    expect(closed.finalAmount).toBe(0);
    expect(closed.settledAt).toBeUndefined();

    const buyerAfter = await User.findById(buyer._id);
    const farmerAfter = await User.findById(farmer._id);
    expect(buyerAfter.walletBalance).toBe(1000);  // unchanged
    expect(farmerAfter.walletBalance).toBe(0);     // unchanged

    const lotAfter = await Lot.findById(lot._id);
    expect(lotAfter.status).toBe('listed');        // reverted

    const txs = await Transaction.find({ auction: auction._id });
    expect(txs).toHaveLength(0);                   // nothing written
  });
});

describe('auctionService.settleAndClose no bids', () => {
  it('reverts the lot to listed and writes no transactions', async () => {
    const { lot, auction } = await liveAuctionFixture({ hasWinner: false });

    const closed = await settleAndClose(auction._id);

    expect(closed.status).toBe('closed');
    expect(closed.finalAmount).toBeUndefined();
    expect(closed.settledAt).toBeUndefined();

    const lotAfter = await Lot.findById(lot._id);
    expect(lotAfter.status).toBe('listed');

    const txs = await Transaction.find({ auction: auction._id });
    expect(txs).toHaveLength(0);
  });
});

describe('auctionService.settleAndClose idempotency', () => {
  it('returns null when called on an auction that is not live', async () => {
    const { auction } = await liveAuctionFixture();
    auction.status = 'closed';
    await auction.save();

    const result = await settleAndClose(auction._id);
    expect(result).toBeNull();
  });

  it('returns null on the second concurrent call (atomic guard)', async () => {
    const { auction } = await liveAuctionFixture({
      weightKg: 100, currentBidPerKg: 80, winnerBalance: 10_000,
    });

    const [a, b] = await Promise.all([
      settleAndClose(auction._id),
      settleAndClose(auction._id),
    ]);

    // exactly one should have settled, the other returns null
    const settled = [a, b].filter(Boolean);
    const nulls = [a, b].filter((x) => x === null);
    expect(settled).toHaveLength(1);
    expect(nulls).toHaveLength(1);
    expect(settled[0].status).toBe('closed');
  });
});
