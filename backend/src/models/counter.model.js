import mongoose, { Schema } from 'mongoose';

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
}, { timestamps: true });

export const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
export default Counter;
