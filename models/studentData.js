const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const guardianSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    relation: { type: String, required: true },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    admissionNo: {
      type: String,
      unique: true,
    },

    firstName: { type: String, required: true },
    middleName: String,
    lastName: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    dob: { type: Date, required: true },
    bloodGroup: String,
    religion: String,
    caste: String,
    nationality: String,
    photoUrl: String,

    // Class/Academic Info
    className: { type: String, required: true },
    section: { type: String, required: true }, // e.g., "A", "B"
    academicYear: { type: String, required: true }, // e.g., "2024-2025"
    admissionDate: { type: Date, required: true },
    rollNo: { type: String }, // Class roll number

    // Contact Info
    phone: { type: String },
    email: { type: String },
    address: addressSchema,

    // Parent/Guardian Info
    father: guardianSchema,
    mother: guardianSchema,
    guardian: guardianSchema, // For single-parent or custodian cases

    // Transport (Optional)
    transportOpted: { type: Boolean, default: false },
    busRoute: String,
    pickupPoint: String,

    // Health (Optional)
    medicalConditions: [String], // e.g., ['Asthma', 'Allergy']

    // Administrative
    status: {
      type: String,
      enum: ["Active", "Inactive", "Transfered", "Graduated", "Dropped"],
      default: "Active",
    },
    remarks: String,
    documents: [
      {
        fileName: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    // System Info
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Student =
  mongoose.models.students || mongoose.model("student", studentSchema);
module.exports = Student;

// example payload
// {
//   "firstName": "Aarav",
//   "middleName": "Kumar",
//   "lastName": "Sharma",
//   "gender": "Male",
//   "dob": "2012-05-15",
//   "bloodGroup": "B+",
//   "religion": "Hindu",
//   "caste": "General",
//   "nationality": "Indian",
//   "photoUrl": "https://example.com/photos/aarav.jpg",

//   "className": "5",
//   "section": "A",
//   "academicYear": "2024-2025",
//   "admissionDate": "2024-06-15",
//   "rollNo": "12",

//   "phone": "9876543210",
//   "email": "aarav.sharma@example.com",

//   "address": {
//     "street": "123 Main Street",
//     "city": "Delhi",
//     "state": "Delhi",
//     "postalCode": "110001",
//     "country": "India"
//   },

//   "father": {
//     "name": "Rajesh Sharma",
//     "phone": "9811122233",
//     "email": "rajesh.sharma@example.com",
//     "relation": "Father"
//   },
//   "mother": {
//     "name": "Suman Sharma",
//     "phone": "9811122244",
//     "email": "suman.sharma@example.com",
//     "relation": "Mother"
//   },
//   "guardian": {
//     "name": "Uncle Sharma",
//     "phone": "9811122255",
//     "email": "uncle.sharma@example.com",
//     "relation": "Guardian"
//   },

//   "transportOpted": true,
//   "busRoute": "Route-5",
//   "pickupPoint": "Sector 14",

//   "medicalConditions": ["Asthma"],
//   "status": "Active",
//   "remarks": "Needs inhaler on school trips",

//   "documents": [
//     {
//       "fileName": "BirthCertificate.pdf",
//       "url": "https://example.com/docs/birth.pdf",
//       "uploadedAt": "2024-06-10T10:30:00Z"
//     },
//     {
//       "fileName": "AadhaarCard.pdf",
//       "url": "https://example.com/docs/aadhaar.pdf",
//       "uploadedAt": "2024-06-10T10:30:00Z"
//     }
//   ],

//   "createdBy": "admin_user"
// }
