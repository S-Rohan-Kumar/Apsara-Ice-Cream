import mongoose, { Schema } from "mongoose";

const storeSettingsSchema = new Schema(
  {
    isStoreOpen: { type: Boolean, default: true },
    closedNotice: { type: String, default: "We're currently closed • Kitchen is resting, reopening soon!" },
    reopenTime: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("StoreSettings", storeSettingsSchema);
