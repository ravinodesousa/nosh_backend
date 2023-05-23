const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const productSchema = new mongoose.Schema({
  name: { type: String },
  image: { type: String },
  price: { type: Number },
  category: {
    type: String,
    // 'Fast Food', 'Dessert', 'Drinks'
  },
  type: {
    type: String,
    // 'Veg', 'Non-Veg'
  },
  // description: { type: String },
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
  is_active: { type: Boolean, default: true },
});

module.exports = mongoose.model("product", productSchema);
