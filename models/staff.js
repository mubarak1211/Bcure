const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  fullName: String,
  role: {
    type: String,
    enum: ["Nurse", "Sanitary"]
  },
  phone: String,
  shift: String,
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital"
  }
});

module.exports = mongoose.model("Staff", staffSchema);