const { check } = require('express-validator');

exports.validateAppointment = [
    // Validate doctorId:
    // - Must not be empty.
    // - Must be a valid MongoDB ObjectId.
    check('doctorId', 'Doctor ID is required and must be a valid ID.')
        .not().isEmpty()
        .isMongoId(),

    // Validate date:
    // - Must not be empty.
    // - Must be a valid date format (e.g., YYYY-MM-DD).
    // - You might want to add a custom validator to ensure it's a future date if required.
    check('date', 'Date is required and must be a valid date format (YYYY-MM-DD).')
        .not().isEmpty()
        .isISO8601() // Checks for valid ISO 8601 date format (e.g., "2023-01-20")
        .toDate(), // Converts the date string to a Date object

    // Validate time:
    // - Must not be empty.
    // - Must be in HH:MM format (e.g., 09:00, 14:30).
    check('time', 'Time is required and must be in HH:MM format (e.g., 09:00).')
        .not().isEmpty()
        .trim() // <--- ADDED THIS LINE: Removes whitespace from both ends
        .matches(/^([01]\d|2[0-3]):([0-5]\d)$/), // Regex for HH:MM format

    // Validate symptoms:
    // - Must not be empty.
    // - You could add a minimum/maximum length if desired.
    check('symptoms', 'Symptoms description is required and cannot be empty.')
        .not().isEmpty()
        .trim() // Removes whitespace from both ends
        .escape() // Escapes HTML entities to prevent XSS attacks
];