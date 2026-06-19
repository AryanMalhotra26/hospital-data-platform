/**
 * express-validator rule sets for the auth routes.
 *
 * Each export is an array of validation "checks" applied to the request body.
 * They run BEFORE the controller; the `validate` middleware collects any
 * failures into a 422 response. Controllers therefore receive clean input.
 *
 * `.trim()`/`.normalizeEmail()` also SANITIZE — they mutate req.body so the
 * controller and DB see consistent values (e.g. lower-cased emails).
 */

'use strict';

const { body } = require('express-validator');

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 120 })
    .withMessage('Name must be at most 120 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  // `role` is optional here. Self-registration may only create the lowest-
  // privilege role; the controller enforces that policy. If a role IS sent,
  // it must at least be one of the known values.
  body('role')
    .optional()
    .isIn(['admin', 'doctor', 'receptionist'])
    .withMessage('Invalid role'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
