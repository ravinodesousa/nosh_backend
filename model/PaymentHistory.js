const { Schema, model } = require("mongoose");
const { ObjectId } = require("bson");

const PaymentHistorySchema = new Schema({
  transactionID: { type: String },
  date: { type: Date },
  amount: { type: String },
});

module.exports = model("paymentHistory", PaymentHistorySchema);
