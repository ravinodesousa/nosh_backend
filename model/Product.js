const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const productSchema = new mongoose.Schema({
  name: { type: String },
  image: { type: String },
  price: { type: Number },
  category: {
    // type: String,
    // 'Fast Food', 'Dessert', 'Drinks'

    type: ObjectId,
    ref: "category",
    required: true,
  },

  type: {
    type: String,
    // 'Veg', 'Non-Veg'
  },
  description: { type: String, default: "" },
  total_orders: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
  },
  total_ratings: {
    type: Number,
    default: 0,
  },
  total_users_rated: {
    type: Number,
    default: 0,
  },
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
  is_active: { type: Boolean, default: true },
  is_special_item: { type: Boolean, default: false },
});

module.exports = mongoose.model("product", productSchema);
