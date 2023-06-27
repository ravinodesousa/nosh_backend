const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  image: {
    type: String,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("category", CategorySchema);
