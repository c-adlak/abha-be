const bcrypt = require('bcryptjs');

/**
 * Generate a random password
 * @param {number} length - Length of password (default: 8)
 * @returns {string} Random password
 */
const generateRandomPassword = (length = 8) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // Ensure at least one uppercase, one lowercase, and one number
  password += charset.charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += charset.charAt(26 + Math.floor(Math.random() * 26)); // Lowercase
  password += charset.charAt(52 + Math.floor(Math.random() * 10)); // Number
  
  // Fill remaining characters
  for (let i = 3; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Check if password needs to be changed (first login)
 * @param {Object} user - User object with isFirstLogin field
 * @returns {boolean} True if password change is required
 */
const requiresPasswordChange = (user) => {
  return user.isFirstLogin === true;
};

module.exports = {
  generateRandomPassword,
  hashPassword,
  comparePassword,
  requiresPasswordChange
};
