const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  profilePicture: {
    type: String,
  },
  Address: {
    ref: "address",
    type: ObjectId,
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
