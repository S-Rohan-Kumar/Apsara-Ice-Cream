import mongoose, { Schema } from "mongoose";

const VariantAvailabilitySchema = new Schema(
    {
        small: { type: Boolean, default: true },
        regular: { type: Boolean, default: true },
        large: { type: Boolean, default: true },
        binge: { type: Boolean, default: true },
        shareIt: { type: Boolean, default: true },
    },
    { _id: false },
);

const VariantStockSchema = new Schema(
    {
        small: { type: Number, default: 50, min: 0 },
        regular: { type: Number, default: 50, min: 0 },
        large: { type: Number, default: 50, min: 0 },
        binge: { type: Number, default: 50, min: 0 },
        shareIt: { type: Number, default: 50, min: 0 },
    },
    { _id: false },
);

const VariantSnoozeSchema = new Schema(
    {
        small: { type: Date, default: null },
        regular: { type: Date, default: null },
        large: { type: Date, default: null },
        binge: { type: Date, default: null },
        shareIt: { type: Date, default: null },
    },
    { _id: false },
);

const ProductSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        imageUrl: { type: String, default: "" },
        description: { type: String, default: "" },
        nutritionInfo: { type: String, default: "" },

        isZeroSugar: { type: Boolean, default: false },

        isAvailable: { type: Boolean, default: true },
        variantAvailability: {
            type: VariantAvailabilitySchema,
            default: () => ({
                small: true,
                regular: true,
                large: true,
                binge: true,
                shareIt: true,
            }),
        },
        variantStock: {
            type: VariantStockSchema,
            default: () => ({
                small: 50,
                regular: 50,
                large: 50,
                binge: 50,
                shareIt: 50,
            }),
        },
        // Stock field for single-type products
        stock: { type: Number, default: 50, min: 0 },

        variantSnoozedUntil: {
            type: VariantSnoozeSchema,
            default: () => ({
                small: null,
                regular: null,
                large: null,
                binge: null,
                shareIt: null,
            }),
        },
        variantSnoozedFrom: {
            type: VariantSnoozeSchema,
            default: () => ({
                small: null,
                regular: null,
                large: null,
                binge: null,
                shareIt: null,
            }),
        },

        isActive: { type: Boolean, default: true },

        priceOverride: {
            small: { type: Number },
            regular: { type: Number },
            large: { type: Number },
            binge: { type: Number },
            shareIt: { type: Number },
        },

        snoozedFrom: {
            type: Date,
            default: null,
        },
        snoozedUntil: {
            type: Date,
            default: null,
        },

        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
);

ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ category: 1, isAvailable: 1, isActive: 1 });

export default mongoose.model("Product", ProductSchema);
