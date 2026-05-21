import mongoose from 'mongoose';

const lotSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  variety: { type: String, enum: ['Bette', 'Rashi', 'Sippe', 'Other'], required: true, index: true },
  grade:   { type: String, enum: ['A', 'B', 'C'], required: true, index: true },

  weightKg:        { type: Number, required: true, min: 0.1 },
  basePricePerKg:  { type: Number, required: true, min: 0 },

  region:      { type: String, required: true, index: true, trim: true },
  moisturePct: { type: Number, min: 0, max: 100, default: null },

  description: { type: String, default: '', maxlength: 1000 },
  images:      { type: [String], default: [] },

  // lifecycle: lot exists -> auction may be created from it -> auction closes
  status: {
    type: String,
    enum: ['draft', 'listed', 'in_auction', 'sold', 'cancelled'],
    default: 'draft',
    index: true,
  },
  isSeeded: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// composite index for typical browse query (variety + grade + region)
lotSchema.index({ variety: 1, grade: 1, region: 1, status: 1 });

export default mongoose.model('Lot', lotSchema);