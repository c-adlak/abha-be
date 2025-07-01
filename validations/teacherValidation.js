const Joi = require("joi");

const teacherValidationSchema = Joi.object({
  name: Joi.object({
    firstName: Joi.string().trim().required(),
    middleName: Joi.string().trim().optional().allow(""),
    lastName: Joi.string().trim().required(),
  }).required(),

  email: Joi.string().email().trim().required(),

  contact: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  alternateContact: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),

  gender: Joi.string().valid("Male", "Female", "Other").optional(),

  dob: Joi.date().less("now").optional(),

  address: Joi.object({
    street: Joi.string().optional().allow(""),
    city: Joi.string().optional().allow(""),
    state: Joi.string().optional().allow(""),
    zip: Joi.string().optional().allow(""),
    country: Joi.string().optional().allow(""),
  }).optional(),

  designation: Joi.string().optional().allow(""),

  joiningDate: Joi.date().optional(),

  status: Joi.string().valid("Active", "Inactive", "On Leave").optional(),
});

module.exports = teacherValidationSchema;
