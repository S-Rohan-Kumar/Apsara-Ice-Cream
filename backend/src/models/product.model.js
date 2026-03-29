import mongoose, { Schema } from 'mongoose';

// For icecream products — each SIZE variant has its own isAvailable flag
// For single products   — only isAvailable (the top-level one) is used
const VariantAvailabilitySchema = new Schema({
  small  : { type: Boolean, default: true },
  regular: { type: Boolean, default: true },
  large  : { type: Boolean, default: true },
  binge  : { type: Boolean, default: true },
  shareIt: { type: Boolean, default: true },
}, { _id: false });

const ProductSchema = new Schema({
  name    : { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  imageUrl: { type: String, default: '' },

  isZeroSugar: { type: Boolean, default: false },

  // Top-level availability — used for single-type products
  // For icecream products this is true if ANY variant is available
  isAvailable: { type: Boolean, default: true },

  // Per-variant availability — only meaningful for icecream products
  // For single products this is ignored
  variantAvailability: {
    type   : VariantAvailabilitySchema,
    default: () => ({
      small  : true,
      regular: true,
      large  : true,
      binge  : true,
      shareIt: true,
    }),
  },

  isActive: { type: Boolean, default: true },

  priceOverride: {
    small  : { type: Number },
    regular: { type: Number },
    large  : { type: Number },
    binge  : { type: Number },
    shareIt: { type: Number },
  },

  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ category: 1, isAvailable: 1, isActive: 1 });

export default mongoose.model('Product', ProductSchema);