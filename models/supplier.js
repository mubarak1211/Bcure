const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const supplierSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: {
    type: String,
    required:true
  },
  companyName: String,
  phone: String,
    walletBalance: {
    type: Number,
    default: 0
  }
});

supplierSchema.pre("save", async function () {

  if (!this.isModified("password")) return ;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  
});

module.exports = mongoose.model("Supplier", supplierSchema);