import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  lot:    { type: mongoose.Schema.Types.ObjectId, ref: 'Lot',  required: true, unique: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  status: {
    type: String,
    enum: ['scheduled', 'live', 'closed', 'cancelled'],
    default: 'scheduled',
    index: true,
  },

  startAt: { type: Date, required: true },
  endAt:   { type: Date, required: true },

  basePricePerKg:   { type: Number, required: true },
  currentBidPerKg:  { type: Number, default: 0 },
  highestBidder:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bidCount:         { type: Number, default: 0 },

  settledAt:    Date,
  finalAmount:  Number,

  onChainAuctionId: { type: Number, default: null },
  createTxHash:     String,
  closeTxHash:      String,
}, { timestamps: true });

auctionSchema.index({ status: 1, endAt: 1 });
auctionSchema.index({ status: 1, startAt: 1 });

export default mongoose.model('Auction', auctionSchema);