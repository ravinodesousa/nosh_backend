const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const InstitutionSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  type: {
    type: String,
    default: "University",
    // School / College / University / Company
  },
  is_active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("institution", InstitutionSchema);
