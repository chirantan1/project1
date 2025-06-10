const { check } = require('express-validator');

exports.validateAppointment = [
    check('doctorId', 'Doctor ID is required').not().isEmpty().withMessage('Doctor ID cannot be empty.'),
    check('date', 'Date is required').not().isEmpty().isISO8601().withMessage('Date must be a valid date in YYYY-MM-DD format.'),
    // FIX: Time validation - now requiring HH:MM format using a regex
    check('time', 'Time is required and must be in HH:MM (24-hour) format.').not().isEmpty()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/) // Enforces two-digit hour (00-23) and two for minute (00-59)
        .withMessage('Time must be in HH:MM (24-hour) format (e.g., 09:30 or 14:00).'),
    check('symptoms', 'Symptoms description is required').not().isEmpty().withMessage('Symptoms cannot be empty.')
];
