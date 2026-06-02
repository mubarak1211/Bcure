const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
});

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  stock: { type: Number, required: true },
  price: { type: Number },
  expiryDate: { type: Date, required: true },
  suppliedDate: { type: Date, required: true },
  supplier: supplierSchema,
});

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String },
  phone: { type: String , required:true},
  email: { type: String },
  password:String,
  // Doctors in this hospital
  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
  
  // Optional: patients (can be inferred from appointments)
  patients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }],

  // Medicine inventory
  medicines: [medicineSchema],

  // Token system (live queue)
  tokens: [{
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    tokenNumber: { type: Number },
    status: { type: String, enum: ['waiting', 'serving', 'completed'], default: 'waiting' },
    createdAt: { type: Date, default: Date.now },
    estimatedWaitTime: { type: Number } // in minutes
  }],
  //subsctipition
  subscriptionPlan: {
  type: String,
  enum: ["basic", "pro", "enterprise"],
  default: "basic"
},

subscriptionAmount: {
  type: Number,
  default: 2000
},

subscriptionStart: {
  type: Date
},

subscriptionEnd: {
  type: Date
},

accountStatus: {
  type: String,
  enum: ["active", "suspended", "blocked"],
  default: "active"
},

  createdAt: { type: Date, default: Date.now },
});

hospitalSchema.pre("save", async function () {

  if (!this.isModified("password")) return ;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});

module.exports = mongoose.model('Hospital', hospitalSchema);