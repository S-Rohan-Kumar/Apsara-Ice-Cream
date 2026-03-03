import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },

  phone: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    default: "",
  },

  role: {
    type: String,
    enum: ["customer", "admin"],
    default: "customer",
  },

  address: {

    fullAddress: {
      type: String,
      default: "",
    },

    landmark: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    }

  },

  location: {

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    }

  },

  isActive: {
    type: Boolean,
    default: true,
  }

},
{
  timestamps: true
}
);

export default mongoose.model("User", userSchema);