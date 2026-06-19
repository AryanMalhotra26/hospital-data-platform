/**
 * Analytics routes: /api/analytics/*  (requires a valid JWT)
 *
 * Only admins and doctors may view analytics ("Admin sees all analytics";
 * doctors see their own, scoped in the controller). Receptionists are 403'd.
 */

'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const { overview } = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/overview', requireRole('admin', 'doctor'), asyncHandler(overview));

module.exports = router;
