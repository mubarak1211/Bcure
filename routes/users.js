const express = require("express")
const Patient=require("../models/patient.js")
const Hospital = require("../models/hospital");
const Doctor = require('../models/doctor.js');
const bcrypt = require("bcryptjs");
const Appointment = require("../models/appointment");
const Report = require("../models/report.js")
const sendWelcomeEmail = require("../utils/sendWelcomeEmail.js");

const router=express.Router()




router.get("/login",(req,res)=>{
    res.render("./user_auth/login.ejs")
  })
router.get("/signup",(req,res)=>{
    res.render("./user_auth/signup.ejs")
  })




router.get("/", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/user/login");
  }
  const patient = await Patient.findById(req.session.userId);

  const appointments = await Appointment.find({
  patientId: req.session.userId
  })
  .populate("doctorId")
  .populate("hospitalId")
  .sort({ appointmentDate: 1 });

//reports
  const reports = await Report.find({
  patientId: req.session.userId
  })
  .populate("doctorId")
  .populate("hospitalId");


//live queue apponitments
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todaysAppointments = await Appointment.find({
  patientId: req.session.userId, 
  appointmentDate: {
    $gte: today,
    $lt: tomorrow
  },
  status: { $nin: ["completed", "cancelled"] }  // 👈 not completed
  })

  .populate("doctorId")
  .populate("hospitalId");

  res.render("user/index", {
  patient,
  appointments,
  reports,
  todaysAppointments   //  send as appointments
  });
  });


//routes of user side bar ....................................................................................

router.get("/dashboard",async(req,res)=>{
  res.redirect("/user")
  })

router.get("/reports",async(req,res)=>{
         if (!req.session.userId) {
       return res.redirect("/user/login");
     }

    const patient = await Patient.findById(req.session.userId);
    const reports = await Report.find({
    patientId: req.session.userId
       })
    .populate("doctorId")
    .populate("hospitalId")
    .sort({ date: -1 });

    res.render("./user/reports.ejs", {
      patient,
      reports,
     
    });


})
router.get("/upcoming-appointments",async(req,res)=>{
    const patient = await Patient.findById(req.session.userId);

  const appointments = await Appointment.find({
    patientId: req.session.userId, // ⭐ IMPORTANT
    status: { $in: ['pending', 'confirmed'] }
  })
    .populate("doctorId")
    .populate("hospitalId")
    .sort({ appointmentDate: 1 });
      res.render("./user/upcoming-appointments.ejs",{appointments,patient})
  })
router.get("/appointments",async(req,res)=>{
   const patient = await Patient.findById(req.session.userId);
  const appointments = await Appointment.find({
  patientId: req.session.userId
  })
  .populate("doctorId")
  .populate("hospitalId")
  .sort({ appointmentDate: 1 });

  res.render("./user/appointments.ejs",{appointments,patient})
  
  })
router.get("/search",async(req,res)=>{
   const patient = await Patient.findById(req.session.userId);
      const { query } = req.query;

    if (!query) {
      return res.render("user/search", { doctors: [] });
    }

    // Find matching hospitals first
    const hospitals = await Hospital.find({
      name: { $regex: query, $options: "i" }
    });

    const hospitalIds = hospitals.map(h => h._id);

    // Find doctors by:
    // name OR specialization OR hospitalId
    const doctors = await Doctor.find({
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { specialization: { $regex: query, $options: "i" } },
        { hospitalId: { $in: hospitalIds } }
      ]
    }).populate("hospitalId");

    res.render("user/search", { doctors ,patient});
  })


router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, phone, age, gender, address, password } = req.body;

    // Check if email already exists
    const existingUser = await Patient.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/user/signup");
    }

    // Create patient
    const patient = new Patient({
      fullName,
      email,
      phone,
      age,
      gender,
      address,
      password,
    });

    await patient.save();
await sendWelcomeEmail(patient.email, patient.fullName, "Patient");
    // Login after signup
    req.session.userId = patient._id;

    // Success flash message
    req.flash("success", "Signed up successfully!");

    res.redirect("/user");

  } catch (err) {

    // Backup duplicate check (MongoDB error)
    if (err.code === 11000) {
      req.flash("error", "Email already exists");
      return res.redirect("/user/signup");
    }

    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/user/signup");
  }
  });


router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  const patient = await Patient.findOne({ email });

  if (!patient) {
  req.flash("error","invalid email")
  return res.redirect("/user/login");
  }

  const isMatch = await bcrypt.compare(password, patient.password);

  if (!isMatch) {
  req.flash("error","password incorrect")
  return res.redirect("/user/login");
  }

  req.session.userId = patient._id;
  req.flash("success","logged in successfully!!")
  res.redirect("/user");
  });

  router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Logout failed");
    }
    res.redirect("/");
  });
  });

module.exports=router;
