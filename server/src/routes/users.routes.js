/**
 * User routes: /api/users/*  (all require a valid JWT)
 *
 * /doctors is open to any authenticated user (dropdowns need it). Everything
 * else is admin-only — this is "Admin: full CRUD on users" from the spec.
 */

'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { createRules, updateRules } = require('../validators/users.validators');
const { listDoctors, list, create, update, remove } = require('../controllers/users.controller');

const router = express.Router();

// Any authenticated user can fetch the doctor list (for assignment/booking UIs).
router.get('/doctors', asyncHandler(listDoctors));

// Admin-only user management.
router.get('/', requireRole('admin'), asyncHandler(list));
router.post('/', requireRole('admin'), createRules, validate, asyncHandler(create));
router.put('/:id', requireRole('admin'), updateRules, validate, asyncHandler(update));
router.delete('/:id', requireRole('admin'), asyncHandler(remove));

module.exports = router;
