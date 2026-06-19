/**
 * Centralized environment configuration.
 *
 * Everything that reads from process.env goes through THIS file, so:
 *   - there is one place to see every config value the app needs, and
 *   - the app FAILS FAST at startup if a required secret is missing, instead
 *     of crashing deep inside a request handler later.
 *
 * We load `server/.env` explicitly (by absolute path) rather than relying on
 * the current working directory, so `npm run dev` works no matter where it's
 * launched from.
 */

'use strict';

const path = require('path');

// server/.env  (this file is server/src/config/env.js -> up 2 levels = server/)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/** Throw a clear error if a required variable is missing. */
function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to server/.env and fill it in.`
    );
  }
  return value;
}

/** Read an optional variable with a default. */
function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4000')),
  clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:5173'),

  db: {
    host: optional('DB_HOST', '127.0.0.1'),
    port: Number(optional('DB_PORT', '3306')),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },

  jwt: {
    // The signing secret is the single most important secret in the app — if
    // it leaks, anyone can forge tokens. So it is REQUIRED (no default).
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '1h'),
  },
};

module.exports = config;
