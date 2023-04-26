const { Schema, model } = require("mongoose");
const { ObjectId } = require("bson");

const TokenHistorySchema = new Schema({
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
  balance: { type: Number, default: 0 },
  paymentDetails: { type: ObjectId, ref: "paymentHistorys" },
});

module.exports = model("tokenHistory", TokenHistorySchema);
