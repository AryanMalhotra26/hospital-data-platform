/**
 * Auth routes: /api/auth/*
 *
 * The pattern for every route is the same and worth internalizing:
 *   1. validation rules (express-validator)   -> reject bad input early
 *   2. validate                               -> turn failures into 422
 *   3. asyncHandler(controller)               -> run logic, forward errors
 */

'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { registerRules, loginRules } = require('../validators/auth.validators');
const { register, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerRules, validate, asyncHandler(register));
router.post('/login', loginRules, validate, asyncHandler(login));

module.exports = router;
