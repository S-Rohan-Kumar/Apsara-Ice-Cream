import mongoose, { Schema } from 'mongoose';

const staffSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['staff', 'delivery', 'rider', 'biller', 'all-rounder', 'manager'],
      default: 'rider',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnDelivery: {
      type: Boolean,
      default: false,
    },
    lastDeliveredAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

staffSchema.index({ phone: 1 });
staffSchema.index({ isActive: 1 });
staffSchema.index({ isOnDelivery: 1, lastDeliveredAt: 1 });

export default mongoose.model('Staff', staffSchema);
