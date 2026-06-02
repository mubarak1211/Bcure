const nodemailer = require("nodemailer");

const sendWelcomeEmail = async (email, name, role) => {
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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Cure HMS 🎉",
      html: `
  <div style="background-color:#f4f6f9; padding:40px 0; font-family: 'Segoe UI', Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
      
      <!-- Header -->
      <div style="background:linear-gradient(90deg, #2c3e50, #3498db); padding:20px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:22px;">
          Bcure Hospital Management System
        </h1>
      </div>

      <!-- Body -->
      <div style="padding:30px;">
        <h2 style="color:#2c3e50; margin-top:0;">
          Welcome, ${name} 👋
        </h2>

        <p style="color:#555; font-size:15px; line-height:1.6;">
          We are pleased to inform you that your registration as 
          <strong>${role}</strong> has been successfully completed.
        </p>

        <p style="color:#555; font-size:15px; line-height:1.6;">
          You can now log in to your dashboard and begin managing your operations seamlessly through our platform.
        </p>

        <!-- Button -->
        <div style="text-align:center; margin:30px 0;">
          <a href="http://localhost:9090/login" 
             style="background:#3498db; color:#ffffff; padding:12px 25px; 
             text-decoration:none; border-radius:5px; font-size:14px;">
             LOGIN
          </a>
        </div>

        <p style="color:#777; font-size:14px;">
          If you did not perform this registration, please contact our support team immediately.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f2f2f2; padding:15px; text-align:center; font-size:12px; color:#888;">
        © ${new Date().getFullYear()} Cure HMS. All rights reserved.
      </div>

    </div>
  </div>

`        
      
    };

    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to:", email);

  } catch (error) {
    console.log("Email sending failed:", error.message);
  }
};

module.exports = sendWelcomeEmail;