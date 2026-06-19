/**
 * Users controller.
 *
 *   - listDoctors is available to any authenticated user (the patient-assign
 *     and appointment-booking dropdowns need it).
 *   - Everything else is ADMIN ONLY (gated by requireRole('admin') in the
 *     route). This is the admin-gated user creation promised in Step 2 — note
 *     that unlike public /auth/register, an admin here MAY create any role.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { findUserById } = require('../db/records');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 10;

/** GET /api/users/doctors — id + name of every doctor (for dropdowns). */
async function listDoctors(req, res) {
  const [rows] = await pool.query(
    "SELECT id, name FROM users WHERE role = 'doctor' ORDER BY name ASC"
  );
  res.json({ data: rows });
}

/** GET /api/users — full user list (admin only). Never returns password_hash. */
async function list(req, res) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY role, name'
  );
  res.json({ data: rows });
}

/** POST /api/users — create a user with any role (admin only). */
async function create(req, res) {
  const { name, email, password, role } = req.body;
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );

  const created = await findUserById(result.insertId);
  res.status(201).json({ data: created });
}

/** PUT /api/users/:id — update name/email/role/password (admin only). */
async function update(req, res) {
  const user = await findUserById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const fields = [];
  const params = [];
  const setIf = (col, value) => {
    fields.push(`${col} = ?`);
    params.push(value);
  };

  if (req.body.name !== undefined) setIf('name', req.body.name);
  if (req.body.email !== undefined) setIf('email', req.body.email);
  if (req.body.role !== undefined) setIf('role', req.body.role);
  if (req.body.password) setIf('password_hash', await bcrypt.hash(req.body.password, BCRYPT_ROUNDS));

  if (fields.length === 0) throw new ApiError(400, 'No updatable fields provided');

  params.push(user.id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

  res.json({ data: await findUserById(user.id) });
}

/** DELETE /api/users/:id — admin only. */
async function remove(req, res) {
  // Guard against an admin deleting their own account and locking themselves
  // out. (Also avoids the surprise of cascading away your own data.)
  if (Number(req.params.id) === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'User not found');
  res.status(204).end();
}

module.exports = { listDoctors, list, create, update, remove };
