const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const CartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
  product: {
    ref: "products",
    type: ObjectId,
  },
  quantity: {
    type: Number,
  },
});

module.exports = mongoose.model("cartItem", CartSchema);
