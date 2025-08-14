const jwt = require('jsonwebtoken');
const Student = require('../models/studentData');
const Teacher = require('../models/teacherModel');
const Admin = require('../models/adminModel');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on decoded ID
    let user = await Student.findById(decoded.id);
    let userType = 'student';
    
    if (!user) {
      user = await Teacher.findById(decoded.id);
      userType = 'teacher';
    }
    
    if (!user) {
      user = await Admin.findById(decoded.id);
      userType = 'admin';
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      type: userType,
      data: user
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Middleware for role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.type;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
};

// Specific role middlewares
const requireAdmin = requireRole(['admin']);
const requireTeacher = requireRole(['teacher', 'admin']);
const requireStudent = requireRole(['student', 'teacher', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireTeacher,
  requireStudent
};
