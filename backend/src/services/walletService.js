import mongoose from 'mongoose';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Transaction from '../models/Transaction.js';
import { notFound, badRequest } from '../utils/httpError.js';

// total amount currently committed by this user as the leading bidder on live auctions
export async function getHeldAmount(userId) {
  const result = await Auction.aggregate([
    { $match: { status: 'live', highestBidder: new mongoose.Types.ObjectId(userId) } },
    { $lookup: { from: 'lots', localField: 'lot', foreignField: '_id', as: 'lotDoc' } },
    { $unwind: '$lotDoc' },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$currentBidPerKg', '$lotDoc.weightKg'] } },
      },
    },
  ]);
  return result[0]?.total || 0;
}

export async function getWalletStatus(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw notFound('user not found');
  const held = await getHeldAmount(userId);
  return {
    balance: user.walletBalance,
    held,
    available: Math.max(0, user.walletBalance - held),
  };
}

export async function topUp(userId, amount) {
  if (!amount || amount <= 0) throw badRequest('amount must be positive');
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true },
  );
  if (!user) throw notFound('user not found');
  await Transaction.create({ user: userId, type: 'credit_topup', amount });
  return { balance: user.walletBalance };
}