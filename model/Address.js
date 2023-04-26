const { Schema, model } = require("mongoose");
const { ObjectId } = Schema.Types;

const AddressSchema = new Schema({
  userId: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
  City: { type: String },
  State: { type: String },
  HouseNumber: { type: String },
  StreetAddress: { type: String },
  ZipCode: { type: Number },
  Landmark: { type: String },
  location: {
    type: { type: String },
    coordinates: [],
  },
});

AddressSchema.index({ location: "2dsphere" });

module.exports = model("address", AddressSchema);
