const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital"
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },
  medicineName: String,
  quantity: Number,

  // ✅ ADDED
  unitPrice: Number,
  totalPrice: Number,
  supplierCommission: Number,
  paymentStatus: {
    type: String,
    default: "paid"
  },

  status: {
    type: String,
    default: "Pending"
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: Date
});

module.exports = mongoose.model("Order", orderSchema);