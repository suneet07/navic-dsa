// MongoDB connection. Optional: without MONGO_URI (or if Mongo is down) the API
// still works — place search falls back to the bundled JSON and history is disabled.
import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDatabase() {
  if (!config.mongoUri) {
    console.warn('[db] MONGO_URI not set — running without MongoDB (history disabled, in-memory place search).');
    return false;
  }
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
    return true;
  } catch (error) {
    console.warn(`[db] MongoDB unavailable (${error.message}) — continuing without it.`);
    return false;
  }
}

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
