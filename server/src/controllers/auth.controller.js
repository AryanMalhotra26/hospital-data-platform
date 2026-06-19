/**
 * Auth controller — register and login.
 *
 * Security decisions worth understanding:
 *   - We store ONLY a bcrypt hash, never the plaintext password. bcrypt is
 *     intentionally slow and salts each hash, which resists brute force and
 *     rainbow tables.
 *   - Login returns the SAME generic 401 whether the email is unknown or the
 *     password is wrong. Telling the user "no such email" would leak which
 *     accounts exist (user enumeration).
 *   - Public self-registration can create ONLY a 'receptionist' (the lowest-
 *     privilege role). This prevents a privilege-escalation / mass-assignment
 *     attack where someone POSTs {"role":"admin"} to mint an admin. Creating
 *     doctors/admins is an admin-only action added in Step 3.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { signAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

// Cost factor for bcrypt. 10 is a sensible default: strong, ~50–100ms/hash.
const BCRYPT_ROUNDS = 10;

/** Shape the public view of a user row (never expose password_hash). */
function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

/**
 * POST /api/auth/register
 * Public self-signup. Always creates a 'receptionist'.
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  // Policy: ignore/forbid any attempt to self-assign a privileged role.
  if (req.body.role && req.body.role !== 'receptionist') {
    throw new ApiError(403, 'Self-registration can only create a receptionist account.');
  }
  const role = 'receptionist';

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // The UNIQUE index on email enforces "one account per email". A duplicate
  // throws ER_DUP_ENTRY, which the central error handler maps to 409.
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );

  const user = { id: result.insertId, name, email, role };
  const token = signAccessToken(user);

  // 201 Created. Return a token so the client is immediately logged in.
  res.status(201).json({ token, user: publicUser(user) });
}

/**
 * POST /api/auth/login
 * Verify credentials, return a JWT access token.
 */
async function login(req, res) {
  const { email, password } = req.body;

  const [rows] = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];

  // Same response for "no such user" and "wrong password" — avoid enumeration.
  // Note: when the user is missing we still run a bcrypt compare against a
  // throwaway hash so the response time doesn't reveal whether the email exists
  // (a basic timing-attack mitigation).
  const hashToCheck = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const passwordOk = await bcrypt.compare(password, hashToCheck);

  if (!user || !passwordOk) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAccessToken(user);
  res.json({ token, user: publicUser(user) });
}

module.exports = { register, login };
