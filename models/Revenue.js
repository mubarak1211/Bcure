const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["subscription", "appointment", "service_fee", "supplier"],
    required: true
  },

  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital"
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  totalAmount: Number,
  platformEarning: Number,
  partnerEarning: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Revenue", revenueSchema);