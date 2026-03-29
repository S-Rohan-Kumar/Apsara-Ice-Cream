import mongoose, { Schema } from 'mongoose';

// productType:
//   'icecream' → has size variants (Small/Regular/Large/Binge + Share-It for normal only)
//   'single'   → fixed price, customer picks quantity (Kulfis, Popsicles, Shakes, Sorbelicious)

const CategorySchema = new Schema({
  name       : { type: String, required: true, unique: true, trim: true },
  imageUrl   : { type: String, default: '' },
  productType: {
    type   : String,
    enum   : ['icecream', 'single'],
    default: 'icecream',
  },
  // For icecream type — prices per variant
  // For single type — only basePrice.regular is used as the flat price
  basePrice: {
    small  : { type: Number, default: 0 },
    regular: { type: Number, required: true },
    large  : { type: Number, default: 0 },
    binge  : { type: Number, default: 0 },
    shareIt: { type: Number, default: 0 }, // 500ml — only for normal icecream, not zero sugar
  },
  // Whether this category has Share-It Pack variant
  // true  → Fruitylicious, Chocolicious, Nuttylicious, Festive Special
  // false → Zero Added Sugar (only goes up to Binge 250ml)
  hasShareIt : { type: Boolean, default: false },
  isZeroSugar: { type: Boolean, default: false }, 
  isActive   : { type: Boolean, default: true },
  sortOrder  : { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Category', CategorySchema);