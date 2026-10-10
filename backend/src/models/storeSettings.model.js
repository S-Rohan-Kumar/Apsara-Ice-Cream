import mongoose, { Schema } from "mongoose";

const storeSettingsSchema = new Schema(
  {
    isStoreOpen: { type: Boolean, default: true },
    closedNotice: { type: String, default: "We're currently closed • Kitchen is resting, reopening soon!" },
    reopenTime: { type: String, default: "" },
    baseDeliveryPrice: { type: Number, default: 30, min: 0 },
    freeDeliveryThreshold: { type: Number, default: 599, min: 0 },
    maxDeliveryRadiusKm: { type: Number, default: 5 },
    storeLocation: {
      lat: { type: Number, default: 13.0033 },
      lng: { type: Number, default: 77.6834 },
      address: { type: String, default: 'Apsara KR Puram Store' },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("StoreSettings", storeSettingsSchema);
