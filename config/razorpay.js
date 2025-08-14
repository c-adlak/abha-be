const Razorpay = require("razorpay");
require("dotenv").config();

let razorpay = null;

// Only initialize Razorpay if the required environment variables are present
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn("⚠️  Razorpay environment variables not found. Payment functionality will be disabled.");
}

module.exports = razorpay;
