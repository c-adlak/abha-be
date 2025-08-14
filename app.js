const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/auth");
const StudentDataRoute = require("./routes/studentData");
const TeacherRoute = require("./routes/teachersRouter");
// const Student = require("./models/studentData");
const { setStudentPassword } = require("./utils/helperFunctions");
const { setTeacherPassword } = require("./utils/helperFunctions");
const { createDefaultAdmin } = require("./utils/helperFunctions");

const errorHandler = require("./middleware/errorHandler");
const feeRoutes = require("./routes/feeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const classRoutes = require("./routes/classRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const adminRoutes = require("./routes/adminRoutes");
const examRoutes = require("./routes/examRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const port = process.env.PORT || 5000;
require("dotenv").config();
// require("dotenv").config({ path: path.resolve(__dirname, ".env") });

//middlewares
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
  })
);
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error while connecting to the database:", error);
  }
}
console.log("Setting up initial credentials...");

// Do not log sensitive environment variables in production

setStudentPassword("ABHA05A007", "abha@123");
setTeacherPassword("ABHA05A001", "abha@123");
createDefaultAdmin("admin@school.com", "admin123");
connectToDatabase();

app.use("/api/auth", authRoutes);
app.use("/api/student", StudentDataRoute);
app.use("/api/teachers", TeacherRoute);
app.use("/api/fees", feeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);

// Serve generated receipts statically
app.use("/receipts", express.static(path.join(__dirname, "receipts")));
app.get("/", (req, res) => {
  console.log("GET request received at /", req.body);
  res.json({ message: "/ endpoint is working!" });
});
// app.use("*", (req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });
app.use(errorHandler);
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
// process.on("SIGTERM", () => {
//   console.log("SIGTERM signal received: closing HTTP server");
//   server.close(() => {
//     console.log("HTTP server closed");
//   });
// });
