const Joi = require("joi");

const addressSchema = Joi.object({
  street: Joi.string().max(100).allow("", null),
  city: Joi.string().max(50).allow("", null),
  state: Joi.string().max(50).allow("", null),
  postalCode: Joi.string()
    .pattern(/^\d{6}$/) // Indian PIN code (6 digits)
    .allow("", null),
  country: Joi.string().max(50).default("India").allow("", null),
});

const guardianSchema = Joi.object({
  name: Joi.string().max(100).required(),
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({ "string.pattern.base": "Phone must be a 10-digit number" }),
  email: Joi.string().email().allow("", null),
  relation: Joi.string().valid("Father", "Mother", "Guardian").required(),
});

const documentSchema = Joi.object({
  fileName: Joi.string().max(100).required(),
  url: Joi.string().uri().required(),
  uploadedAt: Joi.date().iso().required(),
});

const studentSchema = Joi.object({
  enrollmentNo: Joi.string().max(20).optional(),
  admissionNo: Joi.string().max(20).allow("", null),
  scholarNumber: Joi.string().max(50).required(),

  firstName: Joi.string().max(50).required(),
  middleName: Joi.string().max(50).allow("", null),
  lastName: Joi.string().max(50).required(),

  gender: Joi.string().valid("Male", "Female", "Other").required(),

  dob: Joi.date()
    .less("now")
    .required()
    .messages({ "date.less": "DOB must be in the past" }),

  bloodGroup: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .allow("", null),

  religion: Joi.string().max(50).allow("", null),
  caste: Joi.string().max(50).allow("", null),
  nationality: Joi.string().max(50).default("Indian").allow("", null),

  photoUrl: Joi.string().uri().allow("", null),

  className: Joi.string()
    .max(50)
    .required()
    .messages({
      "string.empty": "Class name is required",
    }),

  section: Joi.string()
    .max(10)
    .required()
    .messages({
      "string.empty": "Section is required",
    }),

  academicYear: Joi.string()
    .max(20)
    .required()
    .messages({
      "string.empty": "Academic year is required",
    }),

  admissionDate: Joi.date()
    .max("now")
    .required()
    .messages({ "date.max": "admissionDate cannot be in the future" }),

  rollNo: Joi.string().max(10).allow("", null),

  phone: Joi.string()
    .max(20)
    .allow("", null),

  email: Joi.string().email().allow("", null),

  address: addressSchema,

  father: Joi.object({
    name: Joi.string().max(100).required(),
    phone: Joi.string().max(20).required(),
    email: Joi.string().email().allow("", null),
    relation: Joi.string().max(50).default("Father"),
  }).optional(),
  mother: Joi.object({
    name: Joi.string().max(100).required(),
    phone: Joi.string().max(20).required(),
    email: Joi.string().email().allow("", null),
    relation: Joi.string().max(50).default("Mother"),
  }).optional(),
  guardian: Joi.object({
    name: Joi.string().max(100).allow("", null),
    phone: Joi.string().max(20).allow("", null),
    email: Joi.string().email().allow("", null),
    relation: Joi.string().max(50).allow("", null),
  }).optional(),

  transportOpted: Joi.boolean().default(false),

  busRoute: Joi.when("transportOpted", {
    is: true,
    then: Joi.string().max(50).required(),
    otherwise: Joi.string().max(50).allow("", null),
  }),

  pickupPoint: Joi.when("transportOpted", {
    is: true,
    then: Joi.string().max(50).required(),
    otherwise: Joi.string().max(50).allow("", null),
  }),

  medicalConditions: Joi.alternatives().try(
    Joi.array().items(Joi.string().max(50)),
    Joi.string().max(500)
  ).allow(null, ""),

  status: Joi.string()
    .valid("Active", "Inactive", "Transferred", "Graduated", "Dropped")
    .default("Active"),

  remarks: Joi.string().max(500).allow("", null),

  documents: Joi.array().items(documentSchema).allow(null),

  createdBy: Joi.string().max(50).allow("", null),
});

module.exports = {
  studentSchema,
  addressSchema,
  documentSchema,
  guardianSchema,
};
