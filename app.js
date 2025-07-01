const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const StudentDataRoute = require("./routes/studentData");
const port = 5000;
require("dotenv").config();

//middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);
app.use(express.json());
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
connectToDatabase();
// createStudent(); // Call the function to create a student
app.use("/api/auth", authRoutes);
app.use("/api/student", StudentDataRoute);

app.get("/", (req, res) => {
  console.log("GET request received at /", req.body);
  res.json({ message: "/ endpoint is working!" });
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
