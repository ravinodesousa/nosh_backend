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
    timeSlot: {
      type: String,
    },
    totalAmount: {
      type: String,
    },
    paymentDetails: { type: ObjectId, ref: "paymentHistory" },
  },
  { timestamps: true }
);

module.exports = model("orderSchema", orderSchema);
