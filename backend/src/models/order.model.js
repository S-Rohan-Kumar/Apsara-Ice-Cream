import mongoose, { Schema } from "mongoose";

const OrderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    variant: {
      type: String,
      enum: ["small", "regular", "large", "binge"],
      required: true,
    },
    isZeroSugar: { type: Boolean, default: false },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [OrderItemSchema],

    status: {
      type: String,
      enum: [
        "placed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "placed",
    },

    delivery: {
      address: { type: String, required: true },
      phone: { type: String, required: true },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    pricing: {
      subtotal: { type: Number, required: true },
      discountAmount: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 20 },
      codCharge: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    payment: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      method: { type: String, enum: ["online", "cod"], required: true },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      paidAt: { type: Date },
    },
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index(
  { "payment.razorpayOrderId": 1 },
  { unique: true, sparse: true },
);

export default mongoose.model("Order", orderSchema);
