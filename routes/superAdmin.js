
const express = require("express")
const app = express()
const mongoose = require("mongoose")
const Patient=require("../models/patient")
const path=require("path")
const ejsMate=require("ejs-mate")
const Hospital = require("../models/hospital");
const Doctor = require('../models/doctor.js');
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Appointment = require("../models/appointment");
const Medicine = require("../models/medicine");
const Supplier = require("../models/supplier");
const Order = require("../models/order");
const Report = require("../models/report.js")
const ApiError = require('../utils/ApiError');
const fetch = require("node-fetch");

const flash = require("connect-flash")

const users = require("../routes/users.js")
const hospitals=require("../routes/hospitals.js")
const doctors=require("../routes/doctors.js")
const appointments=require("../routes/appointments.js")
const suppliers=require("../routes/suppliers")
const reports=require("../routes/reports.js")
const Staff=require("../models/staff.js")

const router=express.Router()

const PORT=9090;

const isSuperAdmin = (req, res, next) => {
  if (!req.session.superAdminId) {
    return res.redirect("/super-admin/login");
  }
  next();
};


const SuperAdmin = require("../models/SuperAdmin");

router.get("/revenue", async (req, res) => {
  try {

    /* ===============================
       1️⃣ TOP REVENUE CARDS
    =============================== */

    const appointmentAgg = await Appointment.aggregate([
      { $match: { status: "completed", paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$platformCommission" } } }
    ]);
    const appointmentRevenue = appointmentAgg[0]?.total || 0;

    const medicineAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$supplierCommission" } } }
    ]);
    const medicineRevenue = medicineAgg[0]?.total || 0;

    const hospitalAgg = await Hospital.aggregate([
      { $match: { accountStatus: "active" } },
      { $group: { _id: null, total: { $sum: "$subscriptionAmount" } } }
    ]);
    const subscriptionRevenue = hospitalAgg[0]?.total || 0;

    const totalRevenue =
      appointmentRevenue + medicineRevenue + subscriptionRevenue;

    /* ===============================
       2️⃣ SMALL STATS
    =============================== */

    const newDoctors = await Doctor.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });

    const activeHospitals = await Hospital.countDocuments({
      accountStatus: "active"
    });

    const patients = await Patient.countDocuments();

    const medicinesSoldAgg = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      },
      { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);
    const medicinesSold = medicinesSoldAgg[0]?.total || 0;

    /* ===============================
       3️⃣ LAST 30 DAYS CHART DATA
    =============================== */

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const appointmentChart = await Appointment.aggregate([
      { $match: { createdAt: { $gte: last30Days }, status: "completed" } },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%d", date: "$createdAt" } } },
          total: { $sum: "$platformCommission" }
        }
      }
    ]);

    const medicineChart = await Order.aggregate([
      { $match: { orderDate: { $gte: last30Days } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%d", date: "$orderDate" } } },
          total: { $sum: "$supplierCommission" }
        }
      }
    ]);

    // build last 30 days labels
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(8, 10));
    }

    const appointmentMap = {};
    appointmentChart.forEach(d => appointmentMap[d._id.day] = d.total);

    const medicineMap = {};
    medicineChart.forEach(d => medicineMap[d._id.day] = d.total);

    const chartData = {
      labels: days,
      datasets: [
        {
          label: "Appointments",
          data: days.map(d => appointmentMap[d] || 0),
          borderColor: "#4caf50",
          backgroundColor: "rgba(76,175,80,0.1)",
          tension: 0.4
        },
        {
          label: "Medicines",
          data: days.map(d => medicineMap[d] || 0),
          borderColor: "#1c2cff",
          backgroundColor: "rgba(28,44,255,0.1)",
          tension: 0.4
        }
      ]
    };

    /* ===============================
       4️⃣ RENDER
    =============================== */

    res.render("./super-admin/revenue", {
      stats: {
        appointmentRevenue,
        medicineRevenue,
        subscriptionRevenue,
        totalRevenue,
        newDoctors,
        activeHospitals,
        patients,
        medicinesSold
      },
      chartData,
      lastUpdated: "Just now"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// Route to display all patients
router.get('/patients', async (req, res) => {
  try {
    const patients = await Patient.find();
    res.render('./super-admin/patients', { patients }); // Render the EJS template
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.aggregate([
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments"
        }
      },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospitalId",
          foreignField: "_id",
          as: "hospital"
        }
      },
      {
        $unwind: {
          path: "$hospital",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          fullName: 1,
          specialization: 1,
          consultationFee: 1,
          status: 1, // ✅ IMPORTANT
          hospitalName: { $ifNull: ["$hospital.name", "N/A"] },
          appointmentCount: { $size: "$appointments" }
        }
      }
    ]);

    res.render("super-admin/doctors.ejs", { doctors });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get('/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "_id",
          foreignField: "hospitalId",
          as: "doctors"
        }
      },
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "hospitalId",
          as: "appointments"
        }
      },
      {
        $project: {
          name: 1,
          subscriptionPlan: 1,
          accountStatus: 1,
          doctorsCount: { $size: "$doctors" },
          patientsCount: { 
            $size: { 
              $setUnion: ["$appointments.patientId", []] 
            }
          }
        }
      }
    ]);

    res.render('./super-admin/hospitals', { hospitals });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/staff', async (req, res) => {
  try {
    const staffMembers = await Staff.find()
      .populate('hospitalId', 'name')
      .lean();   // ✅ makes it plain JS object (better for EJS)

    // Add hospitalName safely
    staffMembers.forEach(s => {
      s.hospitalName = s.hospitalId ? s.hospitalId.name : "Rida";
    });

    res.render('super-admin/staff', { staffMembers });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get("/suppliers", async (req, res) => {
  try {
    const suppliers = await Supplier.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "supplierId",
          as: "orders"
        }
      },
      {
        $project: {
          name: 1,
          ordersCount: { $size: "$orders" },
          revenue: {
            $sum: "$orders.totalPrice"
          },
          status: { $literal: "Active" }
        }
      }
    ]);

    res.render("super-admin/suppliers", { suppliers });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});



router.get("/create", async (req, res) => {
  const SuperAdmin = require("../models/SuperAdmin");

  const admin = new SuperAdmin({
    email: "admin@1234",
    password: "admin@1234"
  });

  await admin.save();
  res.send("Super Admin created");
});



// Show login page
router.get("/login", (req, res) => {
  res.render("./super-admin_auth/login.ejs");
});

// Handle login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await SuperAdmin.findOne({ email });
  if (!admin) return res.send("Invalid credentials");

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.send("Invalid credentials");

  req.session.superAdminId = admin._id;
  res.redirect("/super-admin");
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/super-admin/login");
  });
});

// 📊 DASHBOARD
router.get("/", isSuperAdmin, async (req, res) => {
  try {


    const appointmentRevenue = await Appointment.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: "$platformCommission" }
    }
  }
]);
const appointmentRTotal = appointmentRevenue[0]?.total || 0;

const medicineRevenue = await Order.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: "$supplierCommission" }
    }
  }
]);

const medicineRTotal = medicineRevenue[0]?.total || 0;

const hospitalRevenue = await Hospital.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: "$subscriptionAmount" }
    }
  }
]);

const hospitalRTotal = hospitalRevenue[0]?.total || 0;

////////////////////////////////////////////////////////////

    // 1️⃣ Appointment Commission
  

    // 3️⃣ Total Platform Revenue
    
//////////////////////////////////////////////


const totalRevenue =
  appointmentRTotal +
  medicineRTotal +
  hospitalRTotal ;



const appointmentTotal = appointmentRevenue[0]?.total || 0;
    // COUNTS
    const totalHospitals = await Hospital.countDocuments({
      accountStatus: "active"
    });

    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await Patient.countDocuments();
    const totalSuppliers = await Supplier.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalReports = await Report.countDocuments();

    

    // STAFF = Doctors + Suppliers
    const totalStaff = totalDoctors + totalSuppliers;

    // 💰 TOTAL REVENUE (Hospital Earnings from Appointments)
  

    res.render("./super-admin/index", {
      totalHospitals,
      totalDoctors,
      totalPatients,
      totalSuppliers,
      totalAppointments,
      totalReports,
      totalStaff,
      totalRevenue,
      hospitalRTotal,medicineRTotal,appointmentRTotal,
     
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
});


module.exports=router;