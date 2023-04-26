const { Schema, model } = require("mongoose");
const { ObjectId } = require("bson");

const PaymentHistorySchema = new Schema({
  transactionID: { type: String },
  amount: { type: String },
});

module.exports = model("paymentHistory", PaymentHistorySchema);
