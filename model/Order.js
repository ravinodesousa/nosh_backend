const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;
const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    products: [
      {
        product: { type: ObjectId, ref: "product" },
        quantity: {
          type: Number,
        },
      },
    ],
    userId: {
      type: ObjectId,
      ref: "user",
      required: true,
    },
    canteenId: {
      type: ObjectId,
      ref: "user",
      required: true,
    },
    orderStatus: {
      // PENDING,ACCEPTED,REJECTED,CANCELED,READY,DELIVERED
      type: String,
    },
    rejectReason: {
      type: String,
    },
    paymentMode: {
      // ONLINE, TOKEN, COD
      type: String,
    },
    paymentStatus: {
      // true: paid, false: unpaid
      type: Boolean,
      default: false,
    },
    timeSlot: {
      type: String,
    },
    totalAmount: {
      type: String,
    },
    commissionPercentage: {
      type: Number,
    },
    amountEarnedByNosh: {
      type: Number,
    },
    amountEarnedByCanteen: {
      type: Number,
    },
    paymentDetails: { type: ObjectId, ref: "paymentHistory" },
    isRated: {
      // true: Order rated by user, false
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("orderSchema", orderSchema);
