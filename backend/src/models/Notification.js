import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['outbid', 'auction_won', 'auction_lost', 'lot_received_bid', 'auction_starting_soon'],
    required: true,
    index: true,
  },
  title: { type: String, required: true, maxlength: 120 },
  body:  { type: String, default: '', maxlength: 500 },
  link:  { type: String, default: '' },  // e.g. '/lots/{id}'
  read:  { type: Boolean, default: false, index: true },
  isSeeded: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// query pattern: find unread for a user, newest first
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
