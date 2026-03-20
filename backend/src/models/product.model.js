import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    imageUrl: { type: String, default: "" },
    isZeroSugar: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    priceOverride: {
      small: { type: Number },
      regular: { type: Number },
      large: { type: Number },
      binge: { type: Number },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, isAvailable: 1, isActive: 1 });
productSchema.index({ name: "text" });

export default mongoose.model("Product", productSchema);
