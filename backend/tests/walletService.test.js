import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  getHeldAmount,
  getWalletStatus,
  topUp,
} from '../src/services/walletService.js';
import User from '../src/models/User.js';
import Lot from '../src/models/Lot.js';
import Auction from '../src/models/Auction.js';
import Transaction from '../src/models/Transaction.js';

// ----- helpers -------------------------------------------------------------

async function makeUser(overrides = {}) {
  return User.create({
    name: 'U',
    email: `u${Math.random().toString(36).slice(2, 10)}@test.com`,
    passwordHash: 'x',
    role: 'buyer',
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

// ----- getHeldAmount -------------------------------------------------------

describe('walletService.getHeldAmount', () => {
  it('returns 0 when the user has no winning live auctions', async () => {
    const user = await makeUser();
    expect(await getHeldAmount(user._id)).toBe(0);
  });

  it('sums currentBidPerKg * weightKg across all live auctions the user is leading', async () => {
    const buyer = await makeUser();
    const farmer = await makeUser({ role: 'farmer' });

    const lot1 = await makeLot(farmer._id, { weightKg: 100 });
    const lot2 = await makeLot(farmer._id, { weightKg: 50 });

    await makeAuction(lot1._id, farmer._id, {
      currentBidPerKg: 80,
      highestBidder: buyer._id,
    });
    await makeAuction(lot2._id, farmer._id, {
      currentBidPerKg: 120,
      highestBidder: buyer._id,
    });

    // 100*80 + 50*120 = 8000 + 6000 = 14000
    expect(await getHeldAmount(buyer._id)).toBe(14000);
  });

  it('ignores closed auctions even if the user was the highest bidder', async () => {
    const buyer = await makeUser();
    const farmer = await makeUser({ role: 'farmer' });
    const lot = await makeLot(farmer._id, { weightKg: 100 });
    await makeAuction(lot._id, farmer._id, {
      status: 'closed',
      currentBidPerKg: 80,
      highestBidder: buyer._id,
    });
    expect(await getHeldAmount(buyer._id)).toBe(0);
  });

  it('ignores live auctions where the user is not the highest bidder', async () => {
    const buyer = await makeUser();
    const otherBuyer = await makeUser();
    const farmer = await makeUser({ role: 'farmer' });
    const lot = await makeLot(farmer._id, { weightKg: 100 });
    await makeAuction(lot._id, farmer._id, {
      currentBidPerKg: 80,
      highestBidder: otherBuyer._id,
    });
    expect(await getHeldAmount(buyer._id)).toBe(0);
  });
});

// ----- getWalletStatus -----------------------------------------------------

describe('walletService.getWalletStatus', () => {
  it('returns balance/held/available for a user with no live auctions', async () => {
    const user = await makeUser({ walletBalance: 5000 });
    const status = await getWalletStatus(user._id);
    expect(status).toEqual({ balance: 5000, held: 0, available: 5000 });
  });

  it('computes available as balance minus held', async () => {
    const buyer = await makeUser({ walletBalance: 10000 });
    const farmer = await makeUser({ role: 'farmer' });
    const lot = await makeLot(farmer._id, { weightKg: 100 });
    await makeAuction(lot._id, farmer._id, {
      currentBidPerKg: 60,
      highestBidder: buyer._id,
    });

    const status = await getWalletStatus(buyer._id);
    expect(status.balance).toBe(10000);
    expect(status.held).toBe(6000);
    expect(status.available).toBe(4000);
  });

  it('clamps available to 0 when held exceeds balance', async () => {
    const buyer = await makeUser({ walletBalance: 1000 });
    const farmer = await makeUser({ role: 'farmer' });
    const lot = await makeLot(farmer._id, { weightKg: 100 });
    await makeAuction(lot._id, farmer._id, {
      currentBidPerKg: 50, // held = 5000 > balance 1000
      highestBidder: buyer._id,
    });

    const status = await getWalletStatus(buyer._id);
    expect(status.available).toBe(0);
  });

  it('throws 404 when the user does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(getWalletStatus(fakeId)).rejects.toMatchObject({ status: 404 });
  });
});

// ----- topUp ---------------------------------------------------------------

describe('walletService.topUp', () => {
  it('increments balance and writes a credit_topup transaction', async () => {
    const user = await makeUser({ walletBalance: 100 });

    const result = await topUp(user._id, 500);
    expect(result.balance).toBe(600);

    const after = await User.findById(user._id);
    expect(after.walletBalance).toBe(600);

    const txs = await Transaction.find({ user: user._id });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('credit_topup');
    expect(txs[0].amount).toBe(500);
  });

  it('throws 400 when amount is zero', async () => {
    const user = await makeUser();
    await expect(topUp(user._id, 0)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when amount is negative', async () => {
    const user = await makeUser();
    await expect(topUp(user._id, -50)).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when the user does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(topUp(fakeId, 100)).rejects.toMatchObject({ status: 404 });
  });

  it('does not write a transaction if the amount is invalid', async () => {
    const user = await makeUser();
    await expect(topUp(user._id, -1)).rejects.toThrow();
    const txs = await Transaction.find({ user: user._id });
    expect(txs).toHaveLength(0);
  });
});
