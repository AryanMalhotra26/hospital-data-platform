/**
 * Shared single-record lookups used across controllers.
 *
 * Centralizing these keeps the SELECT shape (and the joins that add the
 * human-readable doctor_name / patient_name) consistent everywhere, and avoids
 * repeating the same query in multiple controllers.
 */

'use strict';

const { pool } = require('./pool');

/** Patient row joined with its assigned doctor's name, or null if not found. */
async function findPatientById(id) {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.dob, p.gender, p.phone, p.assigned_doctor_id,
            u.name AS doctor_name, p.created_at
     FROM patients p
     LEFT JOIN users u ON u.id = p.assigned_doctor_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/** Appointment row joined with patient + doctor names, or null if not found. */
async function findAppointmentById(id) {
  const [rows] = await pool.query(
    `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_datetime, a.status, a.notes,
            p.name AS patient_name, u.name AS doctor_name, a.created_at
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN users u ON u.id = a.doctor_id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

/** Plain user row (no password_hash), or null. */
async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

/** True if the id belongs to a user whose role is 'doctor'. */
async function isDoctorId(id) {
  const [rows] = await pool.query(
    "SELECT 1 FROM users WHERE id = ? AND role = 'doctor' LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

module.exports = { findPatientById, findAppointmentById, findUserById, isDoctorId };
