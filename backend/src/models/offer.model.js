import mongoose, { Schema } from "mongoose";

const offerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    minOrderAmount: { type: Number, default: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

offerSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 });

export default mongoose.model("Offer", offerSchema);
