const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  canteenName: {
    type: String,
  },
  institution: {
    ref: "institution",
    type: ObjectId,
  },
  profilePicture: {
    type: String,
  },
  canteenImage: {
    type: String,
  },
  email: {
    type: String,
  },
  isEmailConfirmed: { type: Boolean, default: false },
  mobileNo: { type: String },
  isMobileNoConfirmed: { type: Boolean, default: false },
  password: {
    type: String,
    default: null,
  },
  upi: {
    type: String,
    default: "",
  },
  tokenBalance: {
    type: Number,
    default: 0,
  },
  cart: [
    {
      ref: "cartItems",
      type: ObjectId,
    },
  ],
  fcmToken: {
    type: String,
  },
  userType: {
    type: String,
    default: "CUSTOMER",
    // CUSTOMER,CANTEEN,ADMIN
  },
  userStatus: {
    type: String,
    default: "PENDING",
    // ACCEPTED/REJECTED/PENDING/BLOCKED
  },
});

module.exports = mongoose.model("user", userSchema);
