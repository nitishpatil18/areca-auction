import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  bidder:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  pricePerKg:  { type: Number, required: true },
  amountTotal: { type: Number, required: true },
  txHash: String,
  isSeeded: { type: Boolean, default: false, index: true },
}, { timestamps: true });

bidSchema.index({ auction: 1, createdAt: -1 });

export default mongoose.model('Bid', bidSchema);