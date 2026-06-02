const nodemailer = require("nodemailer");

const sendAppointmentEmail = async (
  patientEmail,
  patientName,
  doctorName,
  date,
  timeSlot,
  token
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 🕒 Estimate time logic (example: each token = 15 mins)
    const estimatedMinutes = token * 15;

    await transporter.sendMail({
      from: `"Bcure Support Team" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: "Appointment Request Received - Bcure HMS",
      html: `
        <div style="font-family: Arial; padding:20px; line-height:1.6;">
          <h2 style="color:#2c3e50;">Appointment Confirmation 🏥</h2>
          
          <p>Dear ${patientName},</p>

          <p>Your appointment request has been successfully received.</p>

          <hr>

          <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Selected Time Slot:</strong> ${timeSlot}</p>
          <p><strong>Your Token Number:</strong> ${token}</p>
          <p><strong>Estimated Waiting Time:</strong> Approx. ${estimatedMinutes} minutes</p>

          <hr>

          <p>Please arrive at least <strong>15 minutes earlier</strong> for smooth processing.</p>

          <p>If you need to cancel or reschedule, please login to your dashboard.</p>

          <br>
          <p>Thank you for choosing Bcure.</p>
          <p><strong>Support Team<br>Bcure HMS</strong></p>
        </div>
      `
    });

    console.log("Patient appointment email sent successfully");
  } catch (error) {
    console.log("Patient email error:", error.message);
  }
};

module.exports = sendAppointmentEmail;