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

        isActive: { type: Boolean, default: true },

        priceOverride: {
            small: { type: Number },
            regular: { type: Number },
            large: { type: Number },
            binge: { type: Number },
            shareIt: { type: Number },
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
