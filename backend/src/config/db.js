import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is missing');
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { autoIndex: true });
    logger.info('mongo connected');
  } catch (err) {
    logger.error('mongo connection failed: ' + err.message);
    throw err;
  }
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  mongoose.connection.on('error', (e) => logger.error('mongo error: ' + e.message));
}