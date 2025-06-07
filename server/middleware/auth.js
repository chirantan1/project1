const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    // Verify token and get decoded payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID and exclude password
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Make sure req.user exists (protect middleware should run before)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user info missing',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized`,
      });
    }

    next();
  };
};
