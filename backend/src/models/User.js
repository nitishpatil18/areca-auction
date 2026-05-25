import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true, index: true },
  walletAddress: { type: String, lowercase: true, default: null },
  walletBalance: { type: Number, default: 0, min: 0 },
  region: { type: String, default: null },
  passwordResetToken: { type: String, default: null, index: true },
  passwordResetExpires: { type: Date, default: null },
  isSeeded: { type: Boolean, default: false, index: true },
}, { timestamps: true });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    walletAddress: this.walletAddress,
    walletBalance: this.walletBalance,
    region: this.region,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

export default mongoose.model('User', userSchema);