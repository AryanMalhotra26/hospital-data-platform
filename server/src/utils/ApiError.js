/**
 * ApiError — an Error that carries an HTTP status code.
 *
 * Throwing `new ApiError(404, 'Patient not found')` anywhere in a controller
 * lets the central error handler turn it into a proper JSON response with the
 * right status. This keeps controllers readable: they describe WHAT went wrong,
 * not how to format the response.
 */

'use strict';

class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status (e.g. 400, 401, 403, 404, 409)
   * @param {string} message     human-readable message returned to the client
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    // Marks this as an expected/operational error (vs. a programming bug),
    // so the error handler knows the message is safe to send to clients.
    this.isOperational = true;
  }
}

module.exports = ApiError;
