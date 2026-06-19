/**
 * Validation rules for patient routes.
 * `.optional({ checkFalsy: true })` means empty-string / null fields from the
 * form are treated as "not provided" and skipped (the controller turns them
 * into SQL NULL), so optional fields don't need to be sent at all.
 */

'use strict';

const { body } = require('express-validator');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const nameRule = (chain) =>
  chain.trim().notEmpty().withMessage('Name is required').isLength({ max: 120 });

const optionalCommonRules = [
  body('dob')
    .optional({ checkFalsy: true })
    .matches(DATE_ONLY)
    .withMessage('Date of birth must be YYYY-MM-DD'),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone must be at most 20 characters'),
  body('assigned_doctor_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('assigned_doctor_id must be a positive integer')
    .toInt(),
];

// On create, name is required.
const createRules = [nameRule(body('name')), ...optionalCommonRules];

// On update, every field is optional (partial update), but if name is sent it
// must be non-empty.
const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 120 }),
  ...optionalCommonRules,
];

module.exports = { createRules, updateRules };
