/**
 * asyncHandler — wraps an async route handler so any rejected promise is
 * forwarded to Express's error handler via next(err).
 *
 * Without this, an exception thrown inside an `async` controller would become
 * an unhandled rejection and the request would hang. With it, controllers can
 * simply `throw new ApiError(...)` and the central error handler takes over.
 *
 * Usage:  router.get('/', asyncHandler(async (req, res) => { ... }))
 */

'use strict';

module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
