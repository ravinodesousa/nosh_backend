const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;
const paymentSchema = new Schema(
  {
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      default: null,
    },
    totalAmount: {
      type: String,
      required: true,
    },
    orders: [{ type: ObjectId, ref: "orderSchema" }],
    canteenId: {
      ref: "user",
      type: ObjectId,
    },
    status: {
      // UNPAID,PAID
      type: String,
      default: "UNPAID",
    },
  },
  { timestamps: true }
);

module.exports = model("payment", paymentSchema);
