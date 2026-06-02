const express = require("express")
const Hospital = require("../models/hospital");
const Doctor = require('../models/doctor.js');
const bcrypt = require("bcryptjs");
const Appointment = require("../models/appointment");
const Medicine = require("../models/medicine");
const Supplier = require("../models/supplier");
const Order = require("../models/order");
const sendWelcomeEmail = require("../utils/sendWelcomeEmail.js");
const Staff = require("../models/staff.js")
const Revenue=require("../models/Revenue.js")
 

const router=express.Router()







router.get("/", async (req, res) => {
  if (!req.session.hospitalId) {
    return res.redirect("/hospital/login");
  }

     const hospital = await Hospital.findById(req.session.hospitalId);
    // Get doctors
    const doctors = await Doctor.find({
      hospitalId: hospital._id
    });

    const orders = await Order.find({
    hospitalId: req.session.hospitalId
  }).populate("supplierId");

  const medicines = await Medicine.find({
    hospitalId: req.session.hospitalId
  });

    const totalDoctors = doctors.length;
    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Today's appointments
    const todaysAppointments = await Appointment.find({
      hospitalId: hospital._id,
      appointmentDate: { $gte: today, $lte: endOfToday }
    })
    .populate("patientId")
    .populate("doctorId")
    .sort({ appointmentDate: -1 });
    
    const allAppointments = await Appointment.find({
      hospitalId: hospital._id
    })
    .populate("patientId")
    .populate("doctorId")
    .sort({ appointmentDate: -1 });

    const totalAppointmentsToday = todaysAppointments.length;

    // PIE CHART DATA
  const served = await Appointment.countDocuments({
    hospitalId: hospital._id,
    status: "completed"
  });

  const waiting = await Appointment.countDocuments({
    hospitalId: hospital._id,
    status: "pending"
  });

  const cancelled = await Appointment.countDocuments({
    hospitalId: hospital._id,
    status: "cancelled"
  });

    const appointments = await Appointment.find({
    hospitalId:hospital._id,
    paymentStatus: "paid"
  });

  let totalRevenue = 0;

  appointments.forEach(app => {
    totalRevenue += app.hospitalEarning || 0;
  });

    res.render("./hospital/index", {
      hospital,
      doctors,
      totalDoctors,
      totalAppointmentsToday,
      todaysAppointments,
      allAppointments,
      orders,
    medicines,
    served,
    cancelled,
    waiting,
     totalRevenue
    });

})
;
 
//hospital sidebar routes .............................................................................

router.get("/dashboard",(req,res)=>{
  res.redirect("/hospital")
})

router.get("/doctors",async(req,res)=>{
    const hospital = await Hospital.findById(req.session.hospitalId);
    const doctors = await Doctor.find({
      hospitalId: hospital._id
    });

  res.render("./hospital/doctors.ejs",{doctors,hospital})

})
router.get("/livepatientsqueue",async(req,res)=>{
  const hospital = await Hospital.findById(req.session.hospitalId);
      const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Today's appointments
    const todaysAppointments = await Appointment.find({
      hospitalId: hospital._id,
      appointmentDate: { $gte: today, $lte: endOfToday }
    })
    .populate("patientId")
    .populate("doctorId")
    .sort({ appointmentDate: -1 });
  res.render("./hospital/livePatientQueue.ejs",{todaysAppointments,hospital})
})


router.get("/appointments",async(req,res)=>{
    const hospital = await Hospital.findById(req.session.hospitalId);
      const allAppointments = await Appointment.find({
      hospitalId: hospital._id
    })
    .populate("patientId")
    .populate("doctorId")
    .sort({ appointmentDate: -1 });

  res.render("./hospital/appointments.ejs",{allAppointments,hospital})
})
router.get("/pharmacy",async(req,res)=>{
    const hospital = await Hospital.findById(req.session.hospitalId);
    const medicines = await Medicine.find({
    hospitalId: req.session.hospitalId
    });
        const orders = await Order.find({
    hospitalId: req.session.hospitalId
  }).populate("supplierId");

  res.render("./hospital/pharmacy.ejs",{medicines,orders,hospital})
})




router.get("/signup",(req,res)=>{
    res.render("./hospital_auth/signup.ejs")
})


router.post("/signup", async (req, res) => {

    const { name, location, description, phone, email, password } = req.body;
      if (!name || !location || !email || !password) {
      return res.send("All fields required");
    }

    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      req.flash("error", "Email already registered");
      return res.redirect("/hospital/signup");
    }
    const hospital = new Hospital({
      name,
      location,
      description,
      phone,
      email,
      password   // ✅ SAVE PASSWORD
    });

    await hospital.save();
    await sendWelcomeEmail(hospital.email, hospital.name, "Hospital");
    req.flash("success","Signed up successfully")
    res.redirect("/hospital/login");


});

router.get("/login",(req,res)=>{
  res.render("./hospital_auth/login.ejs")
});

router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const hospital = await Hospital.findOne({ email });

    if (!hospital) {
      req.flash("error","inavlid email!!")
      return res.redirect("/hospital/login")
    }

    const isMatch = await bcrypt.compare(password, hospital.password);

    if (!isMatch) {
    req.flash("error","inavlid password!!")
      return res.redirect("/hospital/login")
    }


    req.session.hospitalId = hospital._id;
    req.flash("success","loggedin successfully");
    res.redirect("/hospital");


})
;

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Logout failed");
    res.redirect("/");
  });
});


//orders
router.get("/order-medicine", async (req, res) => {

  let suppliers = await Supplier.find();

  res.render("./hospital/order-medicine.ejs", {
    suppliers
  });

});router.post("/order-medicine", async (req, res) => {
  try {
    const hospitalId = req.session.hospitalId;
    let { medicineName, quantity, supplierId } = req.body;

    if (!Array.isArray(medicineName)) {
      medicineName = [medicineName];
      quantity = [quantity];
      supplierId = [supplierId];
    }

    // 🔹 ADD (no conflict)
const MEDICINE_PRICES = {
  "Paracetamol": 2,
  "Ibuprofen": 4,
  "Amoxicillin": 8,
  "Azithromycin": 12,
  "Cefixime": 10,
  "Metformin": 6,
  "Insulin": 25,
  "Atorvastatin": 7,
  "Pantoprazole": 5,
  "Omeprazole": 5,
  "Cetirizine": 3,
  "Diclofenac": 4,
  "Aspirin": 2,
  "Clopidogrel": 9,
  "Dolo 650": 3,
  "ORS": 1,
  "Ranitidine": 4,
  "Ciprofloxacin": 11,
  "Montelukast": 6,
  "Vitamin D3": 15
};

    for (let i = 0; i < medicineName.length; i++) {

      // 🔹 ADD
      const unitPrice = MEDICINE_PRICES[medicineName[i]] || 10;
      const totalPrice = unitPrice * Number(quantity[i]);
      const supplierCommission = totalPrice * 0.10;
      const supplierAmount = totalPrice - supplierCommission;
       const platformCommission = Math.round(totalPrice * 0.10); // 10%

      await Order.create({
        hospitalId,
        supplierId: supplierId[i],
        medicineName: medicineName[i],
        quantity: Number(quantity[i]),

        // 🔹 ADD
        unitPrice,
        totalPrice,
        supplierCommission,
        paymentStatus: "paid",

        status: "Pending"
      });


     await Supplier.findByIdAndUpdate(
    supplierId[i],
    { $inc: { walletBalance: supplierAmount } }
  );

  // 🔥 CREATE REVENUE ENTRY (THIS WAS MISSING)
  await Revenue.create({
    type: "supplier",
    hospitalId,
    supplierId: supplierId[i],

    totalAmount: totalPrice,
    platformEarning: platformCommission,
    partnerEarning: supplierAmount,

    createdAt: new Date()
  });
}

    // 🔹 ADD
    res.redirect("/hospital");

  } catch (err) {
    console.error(err);
    res.status(500).send("Order failed");
  }
});

// remove expired medicine
router.post("/medicine/remove-expired", async (req, res) => {
  try {
   const hospitalId = req.session.hospitalId;

  if (!hospitalId) {
    return res.status(401).send("Unauthorized");
  }

  const today = new Date();

  await Medicine.deleteMany({
    hospitalId: hospitalId,
    expiryDate: { $lt: today }
  });
  res.redirect("/hospital");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error removing expired medicines");
  }
});

// STAFF PAGE
router.get("/staff", async (req, res) => {

  if (!req.session.hospitalId) {
    return res.redirect("/hospital/login");
  }

  const hospital = await Hospital.findById(req.session.hospitalId);

  const nurses = await Staff.find({
    hospitalId: hospital._id,
    role: "Nurse"
  });

  const sanitary = await Staff.find({
    hospitalId: hospital._id,
    role: "Sanitary"
  });

  res.render("./hospital/staff.ejs", {
    nurses,
    sanitary,
    hospital   // ⭐ VERY IMPORTANT
  });

});

router.post("/staff/add", async (req, res) => {

  if (!req.session.hospitalId) {
    return res.redirect("/hospital/login");
  }

  const { fullName, role, phone, shift } = req.body;

  await Staff.create({
    fullName,
    role,
    phone,
    shift,
    hospitalId: req.session.hospitalId   // IMPORTANT
  });

  res.redirect("/hospital/staff");
});

router.get("/staff/add-form", async (req, res) => {

  const hospital = await Hospital.findById(req.session.hospitalId);

  res.render("./hospital/addStaff.ejs", {
    hospital
  });

});

router.post("/staff/delete/:id", async (req, res) => {

  if (!req.session.hospitalId) {
    return res.redirect("/hospital/login");
  }

  await Staff.deleteOne({
    _id: req.params.id,
    hospitalId: req.session.hospitalId
  });

  res.redirect("/hospital/staff");
});

module.exports=router;