/**
 * Patient routes: /api/patients/*  (all require a valid JWT — applied at mount)
 *
 * Role gating lives here via requireRole(...). Row-level scoping (a doctor only
 * seeing their own patients) lives in the controller, because it depends on the
 * data, not just the role.
 */

'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { createRules, updateRules } = require('../validators/patients.validators');
const { list, getOne, create, update, remove } = require('../controllers/patients.controller');

const router = express.Router();

// Read: any authenticated role (the controller scopes a doctor to their own).
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getOne));

// Create: admin + receptionist (doctors cannot create patients).
router.post('/', requireRole('admin', 'receptionist'), createRules, validate, asyncHandler(create));

// Update: admin + doctor (controller restricts a doctor to their own, and
// blocks non-admins from reassigning the doctor).
router.put('/:id', requireRole('admin', 'doctor'), updateRules, validate, asyncHandler(update));

// Delete: admin only.
router.delete('/:id', requireRole('admin'), asyncHandler(remove));

module.exports = router;
