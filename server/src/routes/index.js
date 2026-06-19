/**
 * API router — mounts every feature router under /api.
 * As we add features (patients, appointments, analytics in later steps), they
 * get one line here. app.js stays clean and only knows about this aggregator.
 */

'use strict';

const express = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

module.exports = router;
