const mongoose = require("mongoose");
const { ObjectId } = require("bson");

const notificationSchema = new mongoose.Schema({
  type: { type: String },
  // ORDER-PLACED, ORDER-ACCEPTED, ORDER-READY, ORDER-DELIVERED, MONEY-CREDITED, MONEY-REQUESTED, NEW-CANTEEN-REGISTRATION, RATE-ORDER,
  title: { type: String },
  message: { type: String },
  date: { type: String },
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
});

module.exports = mongoose.model("notification", notificationSchema);
