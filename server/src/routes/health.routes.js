/**
 * Health route: GET /api/health
 * A cheap liveness/readiness probe. Reports whether the API is up and whether
 * it can reach the database. Useful for the README "is everything wired?" check
 * and for any future monitoring.
 */

'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { ping } = require('../db/pool');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    let db = 'down';
    try {
      if (await ping()) db = 'up';
    } catch (_) {
      db = 'down';
    }
    res.json({ status: 'ok', db, time: new Date().toISOString() });
  })
);

module.exports = router;
