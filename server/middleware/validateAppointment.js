const { check } = require('express-validator');

exports.validateAppointment = [
    check('doctorId', 'Doctor ID is required').not().isEmpty(),
    check('date', 'Date is required').not().isEmpty().isISO8601().withMessage('Date must be in YYYY-MM-DD format'), // Added ISO8601 check
    // FIX: Add validation for the 'time' field
    check('time', 'Time is required').not().isEmpty(),
    // Optional: Add a regex check for HH:MM format if your frontend doesn't strictly enforce it
    // check('time', 'Time must be in HH:MM (24-hour) format').matches(/^([01]\d|2[0-3]):([0-5]\d)$/), // This is a good addition
    check('symptoms', 'Symptoms description is required').not().isEmpty()
];