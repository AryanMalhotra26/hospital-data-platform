/**
 * validate — runs after a set of express-validator checks and turns any
 * collected validation errors into a single 422 (Unprocessable Entity)
 * response. If there are no errors, control passes to the real handler.
 *
 * This keeps controllers free of validation boilerplate: routes declare the
 * rules, this middleware enforces them, controllers assume clean input.
 */

'use strict';

const { validationResult } = require('express-validator');

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // 422 = the request was well-formed but failed validation.
  return res.status(422).json({
    error: 'Validation failed',
    details: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    })),
  });
};
