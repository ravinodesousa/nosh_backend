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
        productDetail: { type: ObjectId, ref: "products" },
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
      // PENDING,ACCEPTED,REJECTED,CANCELED,DELIVERED
      type: String,
    },
    rejectReason: {
      type: String,
    },
    paymentMode: {
      // ONLINE, TOKEN
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = model("orderSchema", orderSchema);
