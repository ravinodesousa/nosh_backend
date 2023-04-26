const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  title: { type: String },
  message: { type: String },
  user: {
    type: ObjectId,
    ref: "users",
    required: true,
  },
});

module.exports = mongoose.model("notification", notificationSchema);
