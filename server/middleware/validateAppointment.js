const { check } = require('express-validator');

exports.validateAppointment = [
  check('doctorId', 'Doctor ID is required').not().isEmpty(),
  check('date', 'Date is required').not().isEmpty(),
  check('symptoms', 'Symptoms description is required').not().isEmpty()
];