/**
 * Validation rules for appointment routes.
 * Note: these check SHAPE only (types, formats, enums). Authorization rules
 * (who may set `notes`, whose patient this is, etc.) are enforced in the
 * controller, because they depend on the caller's role and the data.
 */

'use strict';

const { body } = require('express-validator');
const { isValidDateTime } = require('../utils/datetime');

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

const createRules = [
  body('patient_id')
    .notEmpty()
    .withMessage('patient_id is required')
    .bail()
    .isInt({ min: 1 })
    .withMessage('patient_id must be a positive integer')
    .toInt(),

  // doctor_id is optional here: a doctor booking is forced to themselves in the
  // controller; admins/receptionists must supply it (also enforced there).
  body('doctor_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('doctor_id must be a positive integer')
    .toInt(),

  body('appointment_datetime')
    .notEmpty()
    .withMessage('appointment_datetime is required')
    .bail()
    .custom(isValidDateTime)
    .withMessage('appointment_datetime must look like 2026-07-01T14:30'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),

  body('notes')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters'),
];

const updateRules = [
  body('patient_id').optional().isInt({ min: 1 }).withMessage('patient_id must be a positive integer').toInt(),
  body('doctor_id').optional().isInt({ min: 1 }).withMessage('doctor_id must be a positive integer').toInt(),
  body('appointment_datetime')
    .optional({ checkFalsy: true })
    .custom(isValidDateTime)
    .withMessage('appointment_datetime must look like 2026-07-01T14:30'),
  body('status').optional({ checkFalsy: true }).isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  body('notes').optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage('notes must be at most 2000 characters'),
];

module.exports = { createRules, updateRules };
