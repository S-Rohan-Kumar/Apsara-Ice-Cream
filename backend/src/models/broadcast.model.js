import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['promotional', 'festival', 'announcement', 'alert'],
      default: 'promotional',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reachCount: {
      type: Number,
      default: 0,
    },
    pushSent: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

broadcastSchema.index({ createdAt: -1 });

export default mongoose.model('Broadcast', broadcastSchema);
