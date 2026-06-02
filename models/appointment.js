const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({

  // References
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },

  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor', 
    required: true 
  },

  hospitalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hospital', 
    required: true 
  },

  // Appointment Date & Time
  appointmentDate: { 
    type: Date, 
    required: true 
  },

  timeSlot: { 
    type: String, // "10:00 AM - 10:15 AM"
    required: true 
  },

  // Token System
  tokenNumber: { 
    type: Number 
  },

  queueStatus: {
    type: String,
    enum: ['waiting', 'serving', 'completed'],
    default: 'waiting'
  },

  estimatedWaitTime: {
    type: Number // in minutes
  },

  // Appointment Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },

fee: {
  type: Number,
  required: true
},

paymentStatus: {
  type: String,
  enum: ["pending", "paid", "refunded"],
  default: "paid"
},

paymentMethod: {
  type: String,
  enum: ["online", "cash"],
  default: "online"
},

platformCommission: Number,
hospitalEarning: Number,
doctorEarning: Number,


  reason: {
    type: String // reason for visit
  },

  notes: {
    type: String // doctor notes after consultation
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('Appointment', appointmentSchema);