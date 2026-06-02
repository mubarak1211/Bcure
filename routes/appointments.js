const express = require("express")
const Appointment = require("../models/appointment");
const Patient = require("../models/patient");
const Doctor = require("../models/doctor");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const Revenue = require("../models/Revenue");


const router=express.Router()


router.post("/complete/:id", async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, {
    status: "completed"
  });
  res.redirect("/doctor");
})
;

router.post("/cancel/:id", async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, {
    status: "cancelled"
  });
  res.redirect("/doctor");
})
;
router.post("/book", async (req, res) => {

  if (!req.session.userId) {
    return res.redirect("/user/login");
  }

  const { doctorId, hospitalId, appointmentDate, timeSlot, reason } = req.body;

  const selectedDate = new Date(appointmentDate);

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0,0,0,0);

  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23,59,59,999);

  const lastAppointment = await Appointment.findOne({
    doctorId: doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ tokenNumber: -1 });

  let nextToken = 1;
  if (lastAppointment) {
    nextToken = lastAppointment.tokenNumber + 1;
  }

  // ✅ ADDITION 1 — Fetch doctor
  const doctor = await Doctor.findById(doctorId);

  // ✅ ADDITION 2 — Dynamic revenue logic
  const appointmentFee = doctor.consultationFee || 500;
  const platformCommission = Math.round(appointmentFee * 0.1); // 10%
  const hospitalShare = Math.round(appointmentFee * 0.2);      // 20%
  const doctorShare = appointmentFee - (platformCommission + hospitalShare);

  const appointment = new Appointment({
    patientId: req.session.userId,
    doctorId,
    hospitalId,
    appointmentDate: selectedDate,
    timeSlot,
    tokenNumber: nextToken,
    reason,

    // 💰 Revenue fields
    platformCommission: platformCommission,
    hospitalEarning: hospitalShare,
    doctorEarning: doctorShare,
   fee: appointmentFee,
paymentStatus: "paid",
paymentMethod: "online",

    // ❌ KEEP YOUR LOGIC
    status: "pending"
  });

  await appointment.save();

  await Revenue.create({
  type: "appointment",

  hospitalId: hospitalId,
  doctorId: doctorId,
  patientId: req.session.userId,

  totalAmount: appointmentFee,
  platformEarning: platformCommission,
  partnerEarning: hospitalShare, // hospital earning

  createdAt: new Date()
});

  const patient = await Patient.findById(req.session.userId);

  const formattedDate = selectedDate.toDateString();

  await sendAppointmentEmail(
    patient.email,
    patient.fullName,
    doctor.fullName,
    formattedDate,
    timeSlot,
    nextToken
  );

  res.redirect("/user");
});

module.exports=router;