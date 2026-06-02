const express = require("express")
const Hospital = require("../models/hospital");
const Doctor = require('../models/doctor.js');
const Appointment = require("../models/appointment");
const Medicine = require("../models/medicine");
const Report = require("../models/report.js")


const router=express.Router()


router.post("/create/:appointmentId", async (req, res) => {


    const doctor = await Doctor.findById(req.session.doctorId);
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!doctor) return res.send("Doctor not found");
    if (!appointment) return res.send("Appointment not found");

    const hospital = await Hospital.findById(doctor.hospitalId);
    if (!hospital) return res.send("Hospital not found");

    let medicineIds = req.body.medicineId;
    let quantities = req.body.quantity;

    if (!Array.isArray(medicineIds)) {
      medicineIds = [medicineIds];
      quantities = [quantities];
    }


    const fee = doctor.consultationFee;



    let medicinesArray = [];

    for (let i = 0; i < medicineIds.length; i++) {

      const medicine = await Medicine.findById(medicineIds[i]);
      if (!medicine) continue;

      const qty = parseInt(quantities[i]) || 0;

      let givenQty = 0;

      // ===============================
      // SAFE STOCK LOGIC
      // ===============================
      if (qty >= medicine.quantity) {
        givenQty = medicine.quantity;
        medicine.quantity = 0;
      } else {
        givenQty = qty;
        medicine.quantity -= qty;
      }

      await medicine.save();

      // ===============================
      // UPDATE HOSPITAL PHARMACY STOCK
      // ===============================
      const hospitalMedicine = hospital.medicines.find(
        m => m.medicineId.toString() === medicine._id.toString()
      );

      if (hospitalMedicine) {
        hospitalMedicine.quantity = medicine.quantity;
      }

      medicinesArray.push({
        medicineId: medicine._id,
        name: medicine.name,
        quantity: givenQty
      });
    }

    await hospital.save(); // 🔥 save hospital changes

    const report = new Report({
      patientId: req.body.patientId,
      doctorId: doctor._id,
      hospitalId: doctor.hospitalId,
      appointmentId: appointment._id,
      reason: req.body.reason,
      description: req.body.description,
      medicines: medicinesArray
    });

const platformCommission = fee * 0.10; // 10%
const hospitalEarning   = fee * 0.20; // 20%
const doctorEarning     = fee * 0.70; // 70%

    await report.save();
appointment.fee = fee;
appointment.platformCommission = platformCommission;
appointment.hospitalEarning = hospitalEarning;
appointment.doctorEarning = doctorEarning;
appointment.paymentStatus = "paid";
appointment.status = "completed";

await appointment.save();
    await appointment.save();

    res.redirect("/doctor");


});


module.exports=router;