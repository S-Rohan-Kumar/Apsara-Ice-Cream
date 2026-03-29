import mongoose, { Schema } from 'mongoose';

const OrderCounterSchema = new Schema({
  financialYear: { type: String, required: true, unique: true },
  lastNumber   : { type: Number, default: 0 },
});
export const OrderCounter = mongoose.model('OrderCounter', OrderCounterSchema);

export const getCurrentFinancialYear = () => {
  const now   = new Date();
  const month = now.getMonth(); 
  const year  = now.getFullYear();
  const startYear = month >= 3 ? year : year - 1; 
  const endYear   = (startYear + 1).toString().slice(-2);
  return `FY${startYear}-${endYear}`;
};

export const generateOrderNumber = async () => {
  const fy = getCurrentFinancialYear();
  const counter = await OrderCounter.findOneAndUpdate(
    { financialYear: fy },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );
  const num = counter.lastNumber.toString().padStart(3, '0');
  return `ORD-${num}`;
};

const OrderItemSchema = new Schema({
  product    : { type: Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  variant    : {
    type: String,
    enum: ['small', 'regular', 'large', 'binge', 'shareIt', 'single'],
    required: true,
  },
  isZeroSugar: { type: Boolean, default: false },
  quantity   : { type: Number, required: true, min: 1 },
  unitPrice  : { type: Number, required: true },
  totalPrice : { type: Number, required: true },
}, { _id: false });

const OrderSchema = new Schema({
  // Keep 'unique: true' here; it handles both the constraint and the index
  orderNumber: { type: String, unique: true, sparse: true },

  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items   : [OrderItemSchema],
  status: {
    type   : String,
    enum   : ['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed',
  },
  delivery: {
    address : { type: String, required: true },
    phone   : { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  pricing: {
    subtotal      : { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 20 },
    codCharge     : { type: Number, default: 0 },
    total         : { type: Number, required: true },
  },
  payment: {
    razorpayOrderId  : { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    method           : { type: String, enum: ['online', 'cod'], required: true },
    status           : { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt           : { type: Date },
  },
}, { timestamps: true });

// Compound indexes for query optimization
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// REMOVED: OrderSchema.index({ orderNumber: 1 });  <-- This was the duplicate

OrderSchema.index({ 'payment.razorpayOrderId': 1 }, { unique: true, sparse: true });

export default mongoose.model('Order', OrderSchema);