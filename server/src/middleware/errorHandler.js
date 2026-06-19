/**
 * Central error handling.
 *
 *  - notFound: reached only when no route matched -> 404.
 *  - errorHandler: Express recognizes a 4-arg function as the error handler.
 *    Every `next(err)` and every rejection caught by asyncHandler lands here,
 *    so error formatting lives in ONE place.
 *
 * We map a few well-known low-level errors (e.g. MySQL duplicate key) to clean
 * HTTP statuses, and we NEVER leak stack traces or internal messages for
 * unexpected (non-operational) errors in responses.
 */

'use strict';

const ApiError = require('../utils/ApiError');
const config = require('../config/env');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars  (Express needs the 4th `next` arg)
function errorHandler(err, req, res, next) {
  // 1) Our own, intentional errors carry a status + a safe message.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 2) Translate common MySQL driver errors into meaningful HTTP codes.
  if (err && err.code === 'ER_DUP_ENTRY') {
    // e.g. inserting a duplicate email (UNIQUE constraint).
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW')) {
    // e.g. appointment references a patient/doctor id that doesn't exist.
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  // 3) Anything else is an unexpected bug: log the detail server-side, but
  //    return a generic message so we don't expose internals to clients.
  console.error('[unexpected error]', err);
  const body = { error: 'Internal server error' };
  if (config.env !== 'production') {
    body.detail = err.message; // helpful in dev only
  }
  return res.status(500).json(body);
}

module.exports = { notFound, errorHandler };
