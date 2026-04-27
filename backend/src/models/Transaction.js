import mongoose from 'mongoose';

const txSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:   { type: String, enum: ['credit_topup', 'auction_settlement', 'farmer_payout'], required: true },
  amount: { type: Number, required: true },           // signed: positive=credit, negative=debit
  auction:{ type: mongoose.Schema.Types.ObjectId, ref: 'Auction' },
  meta:   { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model('Transaction', txSchema);