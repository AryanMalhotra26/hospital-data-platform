/**
 * Appointments controller.
 *
 * RBAC summary enforced here (role gating is in the routes):
 *   - Doctors see/edit/delete only appointments where doctor_id = their id, and
 *     can only BOOK for patients assigned to them.
 *   - Receptionists may book and reschedule/cancel, but may NOT write clinical
 *     `notes`, and may not reassign the patient/doctor of an appointment.
 *   - Admin can do anything.
 */

'use strict';

const { pool } = require('../db/pool');
const { findAppointmentById, findPatientById, isDoctorId } = require('../db/records');
const ApiError = require('../utils/ApiError');
const { toMysqlDateTime } = require('../utils/datetime');

const BASE_SELECT = `
  SELECT a.id, a.patient_id, a.doctor_id, a.appointment_datetime, a.status, a.notes,
         p.name AS patient_name, u.name AS doctor_name, a.created_at
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN users u ON u.id = a.doctor_id`;

/**
 * GET /api/appointments  (optional ?status= & ?patientId= filters)
 * Doctors are scoped to their own appointments in the WHERE clause.
 */
async function list(req, res) {
  const { role, id } = req.user;
  const where = [];
  const params = [];

  if (role === 'doctor') {
    where.push('a.doctor_id = ?');
    params.push(id);
  }
  if (req.query.status) {
    where.push('a.status = ?');
    params.push(req.query.status);
  }
  if (req.query.patientId) {
    where.push('a.patient_id = ?');
    params.push(req.query.patientId);
  }

  const sql =
    BASE_SELECT +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY a.appointment_datetime DESC';

  const [rows] = await pool.query(sql, params);
  res.json({ data: rows });
}

/** GET /api/appointments/:id */
async function getOne(req, res) {
  const appt = await findAppointmentById(req.params.id);
  if (!appt) throw new ApiError(404, 'Appointment not found');
  if (req.user.role === 'doctor' && appt.doctor_id !== req.user.id) {
    throw new ApiError(403, 'This appointment is not yours');
  }
  res.json({ data: appt });
}

/** POST /api/appointments  (admin, doctor, receptionist) */
async function create(req, res) {
  const { role, id: userId } = req.user;
  const { patient_id } = req.body;

  // A doctor always books AS themselves; others must specify the doctor.
  let doctor_id;
  if (role === 'doctor') {
    doctor_id = userId;
  } else {
    doctor_id = req.body.doctor_id;
    if (!doctor_id) throw new ApiError(400, 'doctor_id is required');
  }

  if (!(await isDoctorId(doctor_id))) {
    throw new ApiError(400, 'doctor_id must reference an existing doctor');
  }

  const patient = await findPatientById(patient_id);
  if (!patient) throw new ApiError(400, 'patient_id must reference an existing patient');

  // Doctors can only book for their own patients.
  if (role === 'doctor' && patient.assigned_doctor_id !== userId) {
    throw new ApiError(403, 'You can only book appointments for your own patients');
  }

  // Field/value-level rules for receptionists.
  const status = req.body.status || 'scheduled';
  if (role === 'receptionist' && status !== 'scheduled') {
    throw new ApiError(403, 'Receptionists can only create scheduled appointments');
  }
  const notes = req.body.notes || null;
  if (role === 'receptionist' && notes) {
    throw new ApiError(403, 'Receptionists cannot add clinical notes');
  }

  const [result] = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, status, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [patient_id, doctor_id, toMysqlDateTime(req.body.appointment_datetime), status, notes]
  );

  const created = await findAppointmentById(result.insertId);
  res.status(201).json({ data: created });
}

/** PUT /api/appointments/:id  (admin; doctor own; receptionist limited) */
async function update(req, res) {
  const { role, id: userId } = req.user;
  const appt = await findAppointmentById(req.params.id);
  if (!appt) throw new ApiError(404, 'Appointment not found');

  if (role === 'doctor' && appt.doctor_id !== userId) {
    throw new ApiError(403, 'This appointment is not yours');
  }

  // Helpers to detect a field that was sent AND actually changes the value.
  const norm = (v) => (v === undefined || v === null ? '' : String(v));
  const provided = (key) => req.body[key] !== undefined;
  const differs = (key, current) => provided(key) && norm(req.body[key]) !== norm(current);

  // Field-level authorization (only block when the value actually changes, so
  // a client re-submitting the whole object with unchanged fields is fine).
  if (differs('patient_id', appt.patient_id) && role !== 'admin') {
    throw new ApiError(403, 'Only an admin can move an appointment to a different patient');
  }
  if (differs('doctor_id', appt.doctor_id) && role !== 'admin') {
    throw new ApiError(403, 'Only an admin can reassign an appointment to a different doctor');
  }
  if (differs('notes', appt.notes) && role === 'receptionist') {
    throw new ApiError(403, 'Receptionists cannot edit clinical notes');
  }

  // Validate any referenced rows the admin is changing.
  if (differs('patient_id', appt.patient_id) && !(await findPatientById(req.body.patient_id))) {
    throw new ApiError(400, 'patient_id must reference an existing patient');
  }
  if (differs('doctor_id', appt.doctor_id) && !(await isDoctorId(req.body.doctor_id))) {
    throw new ApiError(400, 'doctor_id must reference an existing doctor');
  }

  // Build the partial UPDATE from the provided (and now-authorized) fields.
  const fields = [];
  const params = [];
  const setIf = (col, value) => {
    fields.push(`${col} = ?`);
    params.push(value);
  };

  if (provided('patient_id')) setIf('patient_id', req.body.patient_id);
  if (provided('doctor_id')) setIf('doctor_id', req.body.doctor_id);
  if (provided('appointment_datetime') && req.body.appointment_datetime) {
    setIf('appointment_datetime', toMysqlDateTime(req.body.appointment_datetime));
  }
  if (provided('status') && req.body.status) setIf('status', req.body.status);
  if (provided('notes')) setIf('notes', req.body.notes || null);

  if (fields.length === 0) throw new ApiError(400, 'No updatable fields provided');

  params.push(appt.id);
  await pool.query(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`, params);

  const updated = await findAppointmentById(appt.id);
  res.json({ data: updated });
}

/** DELETE /api/appointments/:id  (admin any; doctor own) */
async function remove(req, res) {
  const appt = await findAppointmentById(req.params.id);
  if (!appt) throw new ApiError(404, 'Appointment not found');
  if (req.user.role === 'doctor' && appt.doctor_id !== req.user.id) {
    throw new ApiError(403, 'This appointment is not yours');
  }
  await pool.query('DELETE FROM appointments WHERE id = ?', [appt.id]);
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
