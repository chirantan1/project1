const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure correct path to your User model

/**
 * @function protect
 * @description Middleware to protect routes, ensuring only authenticated users can access them.
 * It verifies the JWT from the request header and attaches the user object to `req.user`.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
    let token;

    // Check if authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the 'Bearer <token>' string
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the JWT_SECRET from environment variables
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by ID from the decoded token payload and exclude the password field
            // Ensure that the 'role' field is included in the selection if it's not default
            req.user = await User.findById(decoded.id).select('-password role'); 

            // Log user role for debugging
            console.log('User from token (in protect):', req.user); // Log the entire user object for more context

            // If no user is found with the ID from the token (e.g., user deleted)
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
            }

            // Proceed to the next middleware or route handler
            next();
        } catch (error) {
            // Handle various token verification errors (e.g., expired, invalid signature)
            console.error('Token verification error:', error.message);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    // If no token was found in the header
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

/**
 * @function authorize
 * @description Middleware to authorize users based on their role.
 * It takes a variable number of roles and checks if the authenticated user's role
 * is included in the allowed roles. This middleware should be used after `protect`.
 * @param {string[]} roles - A list of roles that are allowed to access the route (e.g., 'admin', 'doctor').
 * @returns {Function} Express middleware function
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // Ensure `req.user` is available from the `protect` middleware
        if (!req.user) {
            return res.status(500).json({ success: false, message: 'User not attached to request. Ensure `protect` middleware runs first.' });
        }

        // Safely convert the user's role to lowercase for case-insensitive comparison
        // Use a default empty string if req.user.role is null or undefined
        const userRole = (req.user.role || '').toLowerCase(); 

        // Convert all allowed roles to lowercase for comparison.
        // Added String(role) to ensure `role` is a string before `toLowerCase()`.
        const allowedRoles = roles.map(role => (String(role) || '').toLowerCase()); // FIX: Safely convert each role to string

        console.log('User role being checked (in authorize):', userRole);
        console.log('Allowed roles for this route:', allowedRoles);

        // Check if the authenticated user's role is in the list of allowed roles
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this resource`
            });
        }
        // If authorized, proceed to the next middleware or route handler
        next();
    };
};

// Export the middleware functions
module.exports = {
    protect,
    authorize
};