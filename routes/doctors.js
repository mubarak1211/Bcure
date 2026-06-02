const express = require("express")
const Hospital = require("../models/hospital");
const Doctor = require('../models/doctor.js');
const bcrypt = require("bcryptjs");
const Appointment = require("../models/appointment");
const Medicine = require("../models/medicine");
const sendWelcomeEmail = require("../utils/sendWelcomeEmail.js");

 

const router=express.Router();

router.get("/", async (req, res) => {

  if (!req.session.doctorId) {
    return res.redirect("/doctor/login");
  }


    const doctor = await Doctor.findById(req.session.doctorId)
      .populate("hospitalId");

    let hospitalId=doctor.hospitalId
    let hospital=await Hospital.findById(hospitalId)

    //medicines in doctor's hospital

    const medicines = await Medicine.find({
  hospitalId: doctor.hospitalId._id
});

    // 🔹 Today range
const today = new Date(); today.setHours(0,0,0,0); 
const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);

await Appointment.updateMany(
  {
    appointmentDate: { $lt: today },   // 👈 before today only
    status: { $nin: ["completed", "cancelled"] }
  },
  { $set: { status: "cancelled" } }
);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

// Auto confirm today's pending appointments
await Appointment.updateMany(
  {
    doctorId: doctor._id,             // ✅ only this doctor
    appointmentDate: { $lt: today },  // before today
    status: { $ne: "completed" }      // not completed
  },
  {
    $set: { status: "cancelled" }
  }
);
await Appointment.updateMany(
  {
    doctorId: doctor._id,  // ✅ ADD THIS
    appointmentDate: { $gte: today, $lt: tomorrow },
    status: "pending"
  },
  { $set: { status: "confirmed" } }
);
 

    // 🔹 Get today's appointments
    const todaysAppointments = await Appointment.find({
  doctorId: doctor._id,
  appointmentDate: { $gte: today, $lte: endOfToday }
})
.populate("patientId")
.populate("doctorId")   // 👈 ADD THIS
.sort({ tokenNumber: 1 });
   

const totalToday = todaysAppointments.length;

const completedCount = todaysAppointments.filter(a =>
  a.status === "completed"
).length;

const confirmedCount = todaysAppointments.filter(a =>
  a.status === "confirmed"
).length;



    // 🔥 NEW → Total lifetime appointments
    const totalAppointments = await Appointment.countDocuments({
      doctorId: doctor._id
    });

  

    // 🔥 Get all appointments of this doctor
const allAppointments = await Appointment.find({
  doctorId: doctor._id
})
.populate("patientId")

.sort({ appointmentDate: -1 });

const completedAppointments = await Appointment.find({
  hospitalId: hospitalId,
  doctorId: doctor._id,   // ✅ THIS IS THE KEY FIX
  status: "completed",
  paymentStatus: "paid"
});

  

  let doctorRevenue = 0;

  completedAppointments.forEach(app => {
    doctorRevenue += app.doctorEarning || 0;
  });




    res.render("./doctor/index", {
      doctor,
      todaysAppointments,
      totalToday,
      completedCount,
      pendingCount:confirmedCount,
      totalAppointments,
      allAppointments ,
      hospital,
      medicines ,//  pass to EJS,,
    doctorRevenue
    });

})
;
// Update Doctor Status
router.post("/status", async (req, res) => {

    const { status } = req.body;
    

    // Security check (optional but good)
    if (!["available", "not-available"].includes(status)) {
      return res.redirect("/doctor");
    }

    await Doctor.findByIdAndUpdate(req.session.doctorId, {
      status: status
    });

    res.redirect("/doctor");

}
);
router.get("/login",(req,res)=>{
    res.render("./doctor_auth/login.ejs")
})
router.get("/signup",async(req,res)=>{
   try {
    const hospitals = await Hospital.find(); // get all hospitals
    res.render("doctor_auth/signup.ejs", { hospitals });
  } catch (err) {
    console.log(err);
    res.send("Error loading signup page");
  }})

router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, phone, specialization, experience, hospital, password } = req.body;

    // Required fields check
    if (!fullName || !email || !specialization || !hospital || !password) {
      req.flash("error", "All required fields must be filled");
      return res.redirect("/doctor/signup");
    }

    // Check if email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      req.flash("error", "Email already registered");
      return res.redirect("/doctor/signup");
    }

    // Find hospital
    let mainHospital = await Hospital.findOne({ name: hospital });
    if (!mainHospital) {
      req.flash("error", "Hospital not found");
      return res.redirect("/doctor/signup");
    }

    // Create doctor
    const doctor = new Doctor({
      fullName,
      email,
      phone,
      specialization,
      experience,
      hospitalId: mainHospital._id,
      password
    });

    await doctor.save();
    await sendWelcomeEmail(doctor.email, doctor.fullName, "Doctor");

    // Add doctor to hospital
    mainHospital.doctors.push(doctor._id);
    await mainHospital.save();

    // Success message
    req.flash("success", "Doctor registered successfully!");
    res.redirect("/doctor");

  } catch (err) {

    // Mongo duplicate key error (backup safety)
    if (err.code === 11000) {
      req.flash("error", "Email already exists");
      return res.redirect("/doctor/signup");
    }

    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect("/doctor/signup");
  }
});


router.post("/login", async (req, res) => {

const { email, password } = req.body;

const doctor = await Doctor.findOne({ email });

if (!doctor) {
  req.flash("error","Invalid email")
  return res.redirect("/doctor/login")
}
// Compare hashed password
const isMatch = await bcrypt.compare(password, doctor.password);

if (!isMatch) {
  req.flash("error","Invalid password")
  return res.redirect("/doctor/login")
}
// Save doctor session
req.session.doctorId = doctor._id;
req.flash("success","Logged in successfully !!")
res.redirect("/doctor");

})
;

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Logout failed");
    res.redirect("/");
  });
});



// routes for doctor side bar

router.get("/dashboard",(req,res)=>{
   res.redirect("/doctor")
})

router.get("/appointments",async(req,res)=>{

  
    const doctor = await Doctor.findById(req.session.doctorId)
      .populate("hospitalId");

    const allAppointments = await Appointment.find({
    doctorId: doctor._id
    })
    .populate("patientId")
    .sort({ appointmentDate: -1 });
  res.render("./doctor/appointments.ejs",{ doctor,allAppointments })
}
)

router.get("/patients",async(req,res)=>{
      const doctorId = req.session.doctorId;
      
    const doctor = await Doctor.findById(req.session.doctorId)
    const appointments = await Appointment.find({
      doctorId,
      status: { $in: ['confirmed', 'completed'] }
    })
      .populate({
        path: 'patientId',
        populate: {
          path: 'medicalReports',
          match: { doctorId: doctorId } // 🔥 KEY PART
        }
      })
      .sort({ appointmentDate: -1 });

  res.render("./doctor/patients.ejs",{
     appointments,doctor
  })
})


router.get("/liveQueue",async(req,res)=>{
      const doctor = await Doctor.findById(req.session.doctorId)
      .populate("hospitalId");
      const today = new Date(); today.setHours(0,0,0,0); 
      const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);

       const todaysAppointments = await Appointment.find({
        doctorId: doctor._id,
        appointmentDate: { $gte: today, $lte: endOfToday }
      })
      .populate("patientId")
      .populate("doctorId")   // 👈 ADD THIS
      .sort({ tokenNumber: 1 });

  res.render("./doctor/liveQueue.ejs",{doctor,todaysAppointments})
})





module.exports=router;