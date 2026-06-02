require("dotenv").config();
const express = require("express")
const app = express()
const mongoose = require("mongoose")
const Patient=require("./models/patient")
const path=require("path")
const ejsMate=require("ejs-mate")
const Hospital = require("./models/hospital");
const Doctor = require('./models/doctor.js');
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Appointment = require("./models/appointment");
const Medicine = require("./models/medicine");
const Supplier = require("./models/supplier");
const Order = require("./models/order");
const Report = require("./models/report.js")
const ApiError = require('./utils/ApiError');
const fetch = require("node-fetch");

const flash = require("connect-flash")

const users = require("./routes/users.js")
const hospitals=require("./routes/hospitals.js")
const doctors=require("./routes/doctors.js")
const appointments=require("./routes/appointments.js")
const suppliers=require("./routes/suppliers")
const reports=require("./routes/reports.js")
const OpenAI = require("openai")
const superAdminRoutes = require("./routes/superAdmin");
const {MongoStore}=require("connect-mongo");
const PORT=9090;
const db_url=process.env.ATLASDB_URL;


async function main(params) {
    await mongoose.connect(db_url);
}
main()
.then(()=>{
    console.log("connection is successfull")
})
.catch((err)=>{
    console.log(err)
})

app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))
app.engine("ejs",ejsMate)
app.use(express.static(path.join(__dirname,"/public")))
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, "public")));


app.use(express.json());



// Session Store
const store = MongoStore.create({
  mongoUrl: process.env.ATLASDB_URL,
  collectionName: "sessions",
});

store.on("error", (err) => {
  console.error("SESSION STORE ERROR:", err);
});

app.use(
  session({
    store,
    name: "Bcure_session",
    secret: process.env.MY_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

//admin ......................................................


app.get("/",(req,res)=>{
    res.render("./admin/index")
})

//user...........................................................................................
app.use("/super-admin",superAdminRoutes)

app.use("/user",users)

//Hospital......................................................................................

app.use("/hospital",hospitals)

// Doctor..........................................................................

app.use("/doctor",doctors)

//Appointments.......................................................................

app.use("/appointment",appointments)

//supplier.......................................................................

app.use("/supplier",suppliers)
//report.......................................................................................................................
app.use("/report",reports)


app.get("/patient/ai-assistant", (req, res) => {
  res.render("./user/ai-assistant");
});
app.post("/patient/ai-chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",   // OpenRouter supports this
          messages: [
            {
              role: "system",
              content: `
You are Bcure Hospital AI assistant.

Rules:
- Only suggest possible conditions.
- Never give a final diagnosis.
- Always recommend consulting a doctor.
`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 200
        })
      }
    );

    // Check if router returned ok
    if (!response.ok) {
      const text = await response.text();
      console.log("OpenRouter RAW ERROR:", text);
      return res.json({ reply: "AI service unavailable right now." });
    }

    const data = await response.json();

    // Extract reply
    let reply = "AI didn’t respond properly.";

    if (
      data.choices &&
      data.choices.length > 0 &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      reply = data.choices[0].message.content;
    }

    return res.json({ reply });

  } catch (err) {
    console.error("OpenRouter Error:", err);
    return res.json({ reply: "AI service error." });
  }
});



app.get('/favicon.ico', (req, res) => res.status(204));


app.all(/.*/, (req, res, next) => {
    
    next(new ApiError(404, `Can't find ${req.originalUrl} on this server`));
    res.redirect("/")
});





app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});