/**
 * Patients controller.
 *
 * Authorization recap (role gating happens in the routes; the ROW-LEVEL and
 * FIELD-LEVEL rules below happen here because they depend on the data):
 *   - Doctors may only see/edit patients where assigned_doctor_id = their id.
 *   - Only an admin may set/change assigned_doctor_id (reassignment).
 */

'use strict';

const { pool } = require('../db/pool');
const { findPatientById, isDoctorId } = require('../db/records');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/patients
 * Admin + receptionist see everyone; a doctor sees only their assigned patients.
 * The role-based WHERE clause is the row-level security — not a frontend filter.
 */
async function list(req, res) {
  const { role, id } = req.user;

  let sql = `SELECT p.id, p.name, p.dob, p.gender, p.phone, p.assigned_doctor_id,
                    u.name AS doctor_name, p.created_at
             FROM patients p
             LEFT JOIN users u ON u.id = p.assigned_doctor_id`;
  const params = [];

  if (role === 'doctor') {
    sql += ' WHERE p.assigned_doctor_id = ?';
    params.push(id);
  }
  sql += ' ORDER BY p.name ASC';

  const [rows] = await pool.query(sql, params);
  res.json({ data: rows });
}

/** GET /api/patients/:id */
async function getOne(req, res) {
  const patient = await findPatientById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');

  // A doctor may only view their own patients.
  if (req.user.role === 'doctor' && patient.assigned_doctor_id !== req.user.id) {
    throw new ApiError(403, 'This patient is not assigned to you');
  }
  res.json({ data: patient });
}

/**
 * POST /api/patients   (admin, receptionist)
 * Doctors cannot create patients (enforced by requireRole in the route).
 */
async function create(req, res) {
  const { name } = req.body;
  const dob = req.body.dob || null;
  const gender = req.body.gender || null;
  const phone = req.body.phone || null;
  const assigned_doctor_id = req.body.assigned_doctor_id || null;

  // If a doctor was specified, make sure it actually refers to a doctor.
  if (assigned_doctor_id && !(await isDoctorId(assigned_doctor_id))) {
    throw new ApiError(400, 'assigned_doctor_id must reference an existing doctor');
  }

  const [result] = await pool.query(
    'INSERT INTO patients (name, dob, gender, phone, assigned_doctor_id) VALUES (?, ?, ?, ?, ?)',
    [name, dob, gender, phone, assigned_doctor_id]
  );

  const created = await findPatientById(result.insertId);
  res.status(201).json({ data: created });
}

/**
 * PUT /api/patients/:id   (admin; doctor for their own patients)
 * Field-level rule: only an admin may change assigned_doctor_id.
 */
async function update(req, res) {
  const { role, id: userId } = req.user;
  const patient = await findPatientById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');

  if (role === 'doctor' && patient.assigned_doctor_id !== userId) {
    throw new ApiError(403, 'This patient is not assigned to you');
  }

  // Reassigning a patient to a (different) doctor is an admin-only action.
  const wantsReassign =
    req.body.assigned_doctor_id !== undefined &&
    Number(req.body.assigned_doctor_id) !== patient.assigned_doctor_id;
  if (wantsReassign && role !== 'admin') {
    throw new ApiError(403, 'Only an admin can change a patient\'s assigned doctor');
  }
  if (wantsReassign && req.body.assigned_doctor_id && !(await isDoctorId(req.body.assigned_doctor_id))) {
    throw new ApiError(400, 'assigned_doctor_id must reference an existing doctor');
  }

  // Build a partial UPDATE from only the fields that were actually sent.
  const fields = [];
  const params = [];
  const setIf = (key, value) => {
    fields.push(`${key} = ?`);
    params.push(value);
  };

  if (req.body.name !== undefined) setIf('name', req.body.name);
  if (req.body.dob !== undefined) setIf('dob', req.body.dob || null);
  if (req.body.gender !== undefined) setIf('gender', req.body.gender || null);
  if (req.body.phone !== undefined) setIf('phone', req.body.phone || null);
  if (role === 'admin' && req.body.assigned_doctor_id !== undefined) {
    setIf('assigned_doctor_id', req.body.assigned_doctor_id || null);
  }

  if (fields.length === 0) throw new ApiError(400, 'No updatable fields provided');

  params.push(patient.id);
  await pool.query(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`, params);

  const updated = await findPatientById(patient.id);
  res.json({ data: updated });
}

/**
 * DELETE /api/patients/:id   (admin only)
 * FK ON DELETE CASCADE removes the patient's appointments and visits too.
 */
async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Patient not found');
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
