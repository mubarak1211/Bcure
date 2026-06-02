const express = require("express")
const bcrypt = require("bcryptjs");
const Medicine = require("../models/medicine");
const Supplier = require("../models/supplier");
const Order = require("../models/order");
const sendWelcomeEmail = require("../utils/sendWelcomeEmail.js");
 
const router = express.Router();
const Revenue = require("../models/Revenue");
const mongoose = require("mongoose");





//we are displaying the orders on the dashboard
router.get("/", async (req, res) => {

  if (!req.session.supplierId) {
    return res.redirect("/supplier/login");
  }

  const supplierId = req.session.supplierId;

  const supplier = await Supplier.findById(supplierId);

  const revenueAgg = await Order.aggregate([
    {
      $match: {
        supplierId: new mongoose.Types.ObjectId(supplierId),
        status: "Completed"
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $subtract: ["$totalPrice", "$supplierCommission"]
          }
        }
      }
    }
  ]);

  const totalRevenue =
    revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

  const orders = await Order.find({
    supplierId
  }).populate("hospitalId");

  const totalOrders = orders.length;

  const completedDeliveries = orders.filter(
    order => order.status === "Delivered"
  ).length;

  const pendingRequests = orders.filter(
    order => order.status === "Pending"
  ).length;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayOrders = await Order.find({
    supplierId,
    orderDate: { $gte: startOfDay, $lte: endOfDay }
  }).populate("hospitalId");

  res.render("./supplier/index.ejs", {
    orders: todayOrders,
    supplier,
    totalOrders,
    completedDeliveries,
    pendingRequests,
    totalRevenue
  });

});

//routes for supplier side bar.....................................................................
router.get("/dashboard",(req,res)=>{
  res.redirect("/supplier")
})

router.get("/orders",async(req,res)=>{
   const supplier = await Supplier.findById(req.session.supplierId);
        if (!req.session.supplierId) {
    return res.redirect("/supplier/login");
  }
  const orders = await Order.find({
    supplierId: req.session.supplierId
  }).populate("hospitalId");
  res.render("./supplier/allOrders.ejs", {orders,supplier})
})

router.get("/hospital-requests",async(req,res)=>{
     const supplier = await Supplier.findById(req.session.supplierId);
    const pendingOrders = await Order.find({
     supplierId: req.session.supplierId,
      status: "Pending"
    }).populate("hospitalId");
    res.render("./supplier/hospitalRequests.ejs",{orders:pendingOrders,supplier})
})

router.get("/fullfilled-orders",async(req,res)=>{
    const orders = await Order.find({
    supplierId: req.session.supplierId
  }).populate("hospitalId");
  const completedOrders = await Order.find({
  supplierId: req.session.supplierId,
  status: "Completed"
}).populate("hospitalId");
    

     const supplier = await Supplier.findById(req.session.supplierId);

    res.render("./supplier/fullFilledOrders.ejs",{orders:completedOrders,supplier})
})

router.get("/signup",(req,res)=>{
  res.render("./supplier_auth/signup.ejs")
})

router.post("/signup", async (req, res) => {
  const { name, companyName, email, phone, password } = req.body;
 const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      req.flash("error", "Email already registered");
      return res.redirect("/supplier/signup");
    }
  const supplier = new Supplier({
    name,
    companyName,
    email,
    phone,
    password
  });

  await supplier.save();
  await sendWelcomeEmail(supplier.email, supplier.name, "Supplier");
  res.redirect("/supplier")
});

router.get("/login",(req,res)=>{
  res.render("./supplier_auth/login.ejs")
})

router.post("/login", async (req, res) => {
 const { email, password } = req.body;


const supplier = await Supplier.findOne({ email });

if (!supplier) {
  req.flash("error","Invalid Email")
  return res.redirect("/supplier/login")
}

const isMatch = await bcrypt.compare(password, supplier.password);

if (!isMatch) {
  req.flash("error","Paaword incorrect!!")
  return res.redirect("/supplier/login")
}

req.session.supplierId = supplier._id;
req.flash("success","loggedIn successfully")
res.redirect("/supplier");
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Logout failed");
    res.redirect("/");
  });
});


//supplier conforming the order
router.post("/confirm-order/:id", async (req, res) => {

  const order = await Order.findById(req.params.id);
  const {expiryDate} = req.body
  if (!order) {
    return res.send("Order not found");
  }

  // Check if medicine already exists
  const existingMedicine = await Medicine.findOne({
    hospitalId: order.hospitalId,
    name: order.medicineName
  });

  if (existingMedicine) {
    // Increase quantity
    existingMedicine.quantity += order.quantity;
    existingMedicine.expiryDate = expiryDate;
    await existingMedicine.save();
  } else {
    // Create new medicine
    await Medicine.create({
      hospitalId: order.hospitalId,
      name: order.medicineName,
      quantity: order.quantity,
      expiryDate:expiryDate
    });
  }
   
  // Update order status
  order.status = "Completed";
   order.deliveryDate = new Date();
await order.save();


  res.redirect("/supplier");
});


module.exports=router;
