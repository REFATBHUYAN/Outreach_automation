import mongoose from 'mongoose';
import { env } from './env';

export const connectDb = () => mongoose.connect(env.MONGO_URL);
