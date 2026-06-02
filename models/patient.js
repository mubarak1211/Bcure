const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },       
  description: { type: String },                
  fileUrl: { type: String },                    
  date: { type: Date, default: Date.now },      
});


const patientSchema = new mongoose.Schema({
  
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: { type: String },
   password: {
    type:String,
    required:true
   },
  medicalReports: [reportSchema],

  appointments: [],
  
  activeToken: {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    tokenNumber: { type: Number },
    status: { type: String, enum: ['waiting', 'serving', 'completed'] },
    estimatedWaitTime: { type: Number },
  },

  createdAt: { type: Date, default: Date.now },
});

patientSchema.pre("save", async function () {

  if (!this.isModified("password")) return ;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});

module.exports = mongoose.model('Patient', patientSchema);