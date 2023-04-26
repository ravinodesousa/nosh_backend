const { Schema, model } = require("mongoose");
const { ObjectId } = require("bson");

const OtpSchema = new Schema({
  mobileNo: { type: String },
  email: { type: String },
  token: { type: String, expires: "10m" },
});

module.exports = model("otp", OtpSchema);
