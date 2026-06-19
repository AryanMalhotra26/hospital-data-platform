/**
 * API router — mounts every feature router under /api.
 * As we add features (patients, appointments, analytics in later steps), they
 * get one line here. app.js stays clean and only knows about this aggregator.
 */

'use strict';

const express = require('express');

const { authenticate } = require('../middleware/auth');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const patientsRoutes = require('./patients.routes');
const appointmentsRoutes = require('./appointments.routes');
const usersRoutes = require('./users.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

// Public routes (no token required).
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected routes: authenticate runs FIRST and attaches req.user, so every
// handler below can trust req.user.role / req.user.id for authorization.
router.use('/patients', authenticate, patientsRoutes);
router.use('/appointments', authenticate, appointmentsRoutes);
router.use('/users', authenticate, usersRoutes);
router.use('/analytics', authenticate, analyticsRoutes);

module.exports = router;
