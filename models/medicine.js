const mongoose = require("mongoose");


const medicineSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date
  },
  price: {
    type: Number
  }
});

module.exports = mongoose.model("Medicine", medicineSchema);