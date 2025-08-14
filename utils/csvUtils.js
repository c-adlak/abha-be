const csv = require('csv-parser');
const fs = require('fs');
const { generateRandomPassword, hashPassword } = require('./passwordUtils');

// Sanitize CSV header: lowercase and remove non-alphanumeric characters
const sanitizeHeader = (header) =>
  String(header)
    .toLowerCase()
    .replace(/['`’]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Map sanitized CSV headers to canonical student keys expected by the system
const STUDENT_HEADER_MAP = {
  // Required core fields
  firstname: 'firstName',
  lastname: 'lastName',
  gender: 'gender',
  dob: 'dob',
  dateofbirth: 'dob',
  classname: 'className',
  class: 'className',
  section: 'section',
  academicyear: 'academicYear',
  session: 'academicYear',

  // Optional fields commonly present in samples
  middlename: 'middleName',
  bloodgroup: 'bloodGroup',
  religion: 'religion',
  caste: 'caste',
  nationality: 'nationality',
  photourl: 'photoUrl',
  rollno: 'rollNo',
  rollnumber: 'rollNo',
  phonenumber: 'phone',
  phone: 'phone',
  email: 'email',
  emailaddress: 'email',

  // Address
  streetaddress: 'street',
  address: 'street',
  city: 'city',
  state: 'state',
  postalcode: 'postalCode',
  zipcode: 'postalCode',
  country: 'country',

  // Parent/Guardian
  fathersname: 'fatherName',
  fathersphone: 'fatherPhone',
  fathersemail: 'fatherEmail',
  mothersname: 'motherName',
  mothersphone: 'motherPhone',
  mothersemail: 'motherEmail',
  guardianname: 'guardianName',
  guardianphone: 'guardianPhone',
  guardianemail: 'guardianEmail',
  guardianrelation: 'guardianRelation',

  // Transport
  transportopted: 'transportOpted',
  busroute: 'busRoute',
  pickuppoint: 'pickupPoint',

  // Health
  medicalconditions: 'medicalConditions',

  // Administrative
  remarks: 'remarks',

  // Scholar number
  scholarno: 'scholarNumber',
  scholarnumber: 'scholarNumber',
};

/**
 * Normalize a raw CSV row to canonical keys used by validation/transform.
 * Accepts multiple header variants (case/spacing/punctuation-insensitive).
 */
const mapStudentCsvRow = (row) => {
  const normalized = {};
  for (const [rawKey, value] of Object.entries(row || {})) {
    const key = sanitizeHeader(rawKey);
    const mappedKey = STUDENT_HEADER_MAP[key];
    if (!mappedKey) continue;

    // Assign nested structures where appropriate
    switch (mappedKey) {
      case 'street':
      case 'city':
      case 'state':
      case 'postalCode':
      case 'country': {
        normalized.address = normalized.address || {};
        normalized.address[mappedKey] = String(value || '').trim();
        break;
      }
      case 'fatherName':
      case 'fatherPhone':
      case 'fatherEmail': {
        normalized.father = normalized.father || {};
        const subKey = mappedKey.replace('father', '').toLowerCase();
        // name/phone/email mapping
        if (subKey === 'name') normalized.father.name = String(value || '').trim();
        if (subKey === 'phone') normalized.father.phone = String(value || '').trim();
        if (subKey === 'email') normalized.father.email = String(value || '').trim();
        break;
      }
      case 'motherName':
      case 'motherPhone':
      case 'motherEmail': {
        normalized.mother = normalized.mother || {};
        const subKey = mappedKey.replace('mother', '').toLowerCase();
        if (subKey === 'name') normalized.mother.name = String(value || '').trim();
        if (subKey === 'phone') normalized.mother.phone = String(value || '').trim();
        if (subKey === 'email') normalized.mother.email = String(value || '').trim();
        break;
      }
      case 'guardianName':
      case 'guardianPhone':
      case 'guardianEmail':
      case 'guardianRelation': {
        normalized.guardian = normalized.guardian || {};
        const subKey = mappedKey.replace('guardian', '');
        const targetKey = subKey ? subKey.charAt(0).toLowerCase() + subKey.slice(1) : '';
        if (targetKey) normalized.guardian[targetKey] = String(value || '').trim();
        break;
      }
      case 'transportOpted': {
        const v = String(value || '').trim().toLowerCase();
        normalized.transportOpted = v === 'true' || v === '1' || v === 'yes';
        break;
      }
      default: {
        normalized[mappedKey] = String(value ?? '').trim();
      }
    }
  }

  // Set default relations when names present
  if (normalized.father && normalized.father.name && !normalized.father.relation) {
    normalized.father.relation = 'Father';
  }
  if (normalized.mother && normalized.mother.name && !normalized.mother.relation) {
    normalized.mother.relation = 'Mother';
  }

  return normalized;
};

/**
 * Parse CSV file and return array of objects
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of parsed objects
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

/**
 * Validate student data from CSV
 * @param {Object} studentData - Student data from CSV
 * @returns {Object} Validation result with isValid and errors
 */
const validateStudentData = (studentData) => {
  const errors = [];
  const requiredFields = ['firstName', 'lastName', 'gender', 'dob', 'className', 'section', 'academicYear', 'scholarNumber'];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (!studentData[field] || studentData[field].trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate gender
  if (studentData.gender && !['Male', 'Female', 'Other'].includes(studentData.gender)) {
    errors.push('Invalid gender value. Must be Male, Female, or Other');
  }
  
  // Validate date format
  if (studentData.dob && isNaN(Date.parse(studentData.dob))) {
    errors.push('Invalid date format for dob');
  }
  
  // Validate academic year format (YYYY-YYYY)
  if (studentData.academicYear && !/^\d{4}-\d{4}$/.test(studentData.academicYear)) {
    errors.push('Invalid academic year format. Must be YYYY-YYYY');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Transform CSV data to student model format
 * @param {Object} csvData - Raw CSV data
 * @returns {Object} Transformed student data
 */
const transformStudentData = async (csvData) => {
  // Generate random password
  const randomPassword = generateRandomPassword();
  const hashedPassword = await hashPassword(randomPassword);
  
  // Scholar number provided by CSV
  const scholarNumber = String(csvData.scholarNumber || '').trim();
  
  const student = {
    firstName: csvData.firstName?.trim(),
    middleName: csvData.middleName?.trim() || '',
    lastName: csvData.lastName?.trim(),
    gender: csvData.gender?.trim(),
    dob: new Date(csvData.dob),
    bloodGroup: csvData.bloodGroup?.trim() || '',
    religion: csvData.religion?.trim() || '',
    caste: csvData.caste?.trim() || '',
    nationality: csvData.nationality?.trim() || 'Indian',
    photoUrl: csvData.photoUrl?.trim() || '',

    // Class/Academic Info
    className: csvData.className?.trim(),
    section: csvData.section?.trim(),
    academicYear: csvData.academicYear?.trim(),
    admissionDate: new Date(),
    rollNo: csvData.rollNo?.trim() || '',

    // Contact Info
    phone: csvData.phone?.trim() || '',
    email: csvData.email?.trim() || '',

    // Address
    address: {
      street: csvData.street?.trim() || '',
      city: csvData.city?.trim() || '',
      state: csvData.state?.trim() || '',
      postalCode: csvData.postalCode?.trim() || '',
      country: csvData.country?.trim() || 'India',
    },

    // Transport
    transportOpted: csvData.transportOpted === 'true' || csvData.transportOpted === '1',
    busRoute: csvData.busRoute?.trim() || '',
    pickupPoint: csvData.pickupPoint?.trim() || '',

    // Health
    medicalConditions: csvData.medicalConditions?.split(',').map(c => c.trim()).filter(Boolean) || [],

    // Administrative
    status: 'Active',
    remarks: csvData.remarks?.trim() || '',

    // Password Management
    password: hashedPassword,
    isFirstLogin: true,

    // System Info
    createdBy: 'bulk_upload',

    // Generate unique IDs
    studentId: `STU${Date.now()}${Math.floor(Math.random() * 1000)}`,
    scholarNumber: scholarNumber,

    // Store plain password for admin reference
    _plainPassword: randomPassword
  };

  // Parent/Guardian Info (include only if complete enough to satisfy schema requirements)
  const fatherName = csvData.fatherName?.trim() || csvData.father?.name?.trim();
  const fatherPhone = csvData.fatherPhone?.trim() || csvData.father?.phone?.trim();
  if (fatherName && fatherPhone) {
    student.father = {
      name: fatherName,
      phone: fatherPhone,
      email: csvData.fatherEmail?.trim() || '',
      relation: 'Father',
    };
  }

  const motherName = csvData.motherName?.trim() || csvData.mother?.name?.trim();
  const motherPhone = csvData.motherPhone?.trim() || csvData.mother?.phone?.trim();
  if (motherName && motherPhone) {
    student.mother = {
      name: motherName,
      phone: motherPhone,
      email: csvData.motherEmail?.trim() || '',
      relation: 'Mother',
    };
  }

  const guardianName = csvData.guardianName?.trim() || csvData.guardian?.name?.trim();
  const guardianPhone = csvData.guardianPhone?.trim() || csvData.guardian?.phone?.trim();
  const guardianRelation = csvData.guardianRelation?.trim() || csvData.guardian?.relation?.trim() || 'Guardian';
  if (guardianName && guardianPhone) {
    student.guardian = {
      name: guardianName,
      phone: guardianPhone,
      email: csvData.guardianEmail?.trim() || '',
      relation: guardianRelation,
    };
  }

  return student;
};

/**
 * Process bulk student upload
 * @param {Array} csvData - Array of CSV data objects
 * @returns {Object} Processing result with success and errors
 */
const processBulkStudentUpload = async (csvData) => {
  const results = {
    success: [],
    errors: [],
    total: csvData.length
  };
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 because CSV starts from row 2 (row 1 is header)
    
    try {
      // Normalize headers/keys to canonical student fields
      const normalizedRow = mapStudentCsvRow(row);
      // Validate data
      const validation = validateStudentData(normalizedRow);
      if (!validation.isValid) {
        results.errors.push({
          row: rowNumber,
          data: row,
          errors: validation.errors
        });
        continue;
      }
      
      // Transform data
      const transformedData = await transformStudentData(normalizedRow);
      results.success.push({
        row: rowNumber,
        data: transformedData
      });
      
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        data: row,
        errors: [error.message]
      });
    }
  }
  
  return results;
};

module.exports = {
  parseCSV,
  validateStudentData,
  transformStudentData,
  processBulkStudentUpload
};
