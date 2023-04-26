const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  name: { type: String },
  image: { type: String },
  price: { type: Number },
  description: { type: String },
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
});

module.exports = mongoose.model("product", productSchema);
