import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, default: "" },
    basePrice: {
      small: { type: Number, required: true },
      regular: { type: Number, required: true },
      large: { type: Number, required: true },
      binge: { type: Number, required: true },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
