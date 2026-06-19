/**
 * Validation rules for admin-only user management.
 * Unlike public /auth/register (receptionist-only), here an admin MAY set any
 * role — that's exactly why these routes are gated behind requireRole('admin').
 */

'use strict';

const { body } = require('express-validator');

const ROLES = ['admin', 'doctor', 'receptionist'];

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').notEmpty().withMessage('Role is required').bail().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 120 }),
  body('email').optional().trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

module.exports = { createRules, updateRules };
