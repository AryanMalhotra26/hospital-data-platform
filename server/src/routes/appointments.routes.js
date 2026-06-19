/**
 * Appointment routes: /api/appointments/*  (all require a valid JWT)
 *
 * All three roles can create/update appointments, but the controller applies
 * the finer rules (doctor → own patients only; receptionist → no clinical
 * notes; only admin reassigns patient/doctor).
 */

'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { createRules, updateRules } = require('../validators/appointments.validators');
const { list, getOne, create, update, remove } = require('../controllers/appointments.controller');

const router = express.Router();

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getOne));

router.post('/', requireRole('admin', 'doctor', 'receptionist'), createRules, validate, asyncHandler(create));
router.put('/:id', requireRole('admin', 'doctor', 'receptionist'), updateRules, validate, asyncHandler(update));

// Delete (hard): admin or the owning doctor. Receptionists cancel via a status
// update instead of deleting.
router.delete('/:id', requireRole('admin', 'doctor'), asyncHandler(remove));

module.exports = router;
