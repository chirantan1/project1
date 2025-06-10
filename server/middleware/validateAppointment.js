const { check } = require('express-validator');

exports.validateAppointment = [
  check('doctorId', 'Doctor ID is required').not().isEmpty(),
  check('date', 'Date is required').not().isEmpty()
    .isISO8601().toDate() // Added .isISO8601() to validate date format and .toDate() to convert it
    .withMessage('Date must be a valid date in YYYY-MM-DD format.'),
  check('time', 'Time is required').not().isEmpty() // <--- ADDED THIS LINE
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/) // Added regex to validate HH:MM format
    .withMessage('Time must be in HH:MM format (e.g., 09:30).'),
  check('symptoms', 'Symptoms description is required').not().isEmpty()
];