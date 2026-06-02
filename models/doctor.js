const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const doctorSchema = new mongoose.Schema({
  
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  specialization: { type: String, required: true },  
  experience: { type: Number },       
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  password:{type : String,requied:true},
  status: {
  type: String,
  enum: ["available", "not-available"],
  default: "not-available"
},

consultationFee: {
  type: Number,
  default: 500
},


  createdAt: { type: Date, default: Date.now },
});

doctorSchema.pre("save", async function () {

  if (!this.isModified("password")) return ;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});

module.exports = mongoose.model('Doctor', doctorSchema);