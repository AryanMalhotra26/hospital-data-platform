/**
 * Analytics controller — all four dashboards in ONE endpoint.
 *
 * Key principle (per the spec): every metric is computed with a SQL aggregation
 * (GROUP BY + date functions + COUNT), NOT by pulling rows into Node and looping.
 * The database is far better at this, and the indexes from schema.sql make each
 * GROUP BY cheap.
 *
 * Role scoping:
 *   - admin  -> global numbers (doctorId = null, no extra filter)
 *   - doctor -> scoped to their own data (WHERE doctor_id = ?)
 *   (receptionists don't reach here — the route requires admin/doctor.)
 *
 * Indexing notes (why each query is fast):
 *   - appointmentsByMonth: idx_appointments_datetime supports the date-range
 *     scan; for a doctor, idx_appointments_doctor_datetime covers doctor + date.
 *   - patientsByDepartment: idx_visits_department supports GROUP BY department.
 *   - statusBreakdown: status has only 4 values (low selectivity) so it's
 *     intentionally NOT indexed — a full scan + group is cheapest here.
 *   - topDiagnoses: idx_visits_diagnosis supports GROUP BY diagnosis_code.
 */

'use strict';

const { pool } = require('../db/pool');

// Lower bound of the "last 12 months" window. We anchor to the LATEST
// appointment in the data (not CURDATE()) so the dashboard stays populated even
// if the app is run long after the seed's date — the seed is fixed in time.
const WINDOW_LOWER_BOUND =
  "DATE_SUB(DATE_FORMAT((SELECT MAX(appointment_datetime) FROM appointments), '%Y-%m-01'), INTERVAL 11 MONTH)";

/** Appointments grouped by calendar month over the last 12 months (line chart). */
async function appointmentsByMonth(doctorId) {
  const where = [`appointment_datetime >= ${WINDOW_LOWER_BOUND}`];
  const params = [];
  if (doctorId) {
    where.push('doctor_id = ?');
    params.push(doctorId);
  }
  // DATE_FORMAT(..., '%Y-%m') buckets each row into "2026-06"; GROUP BY collapses
  // them; COUNT(*) tallies each bucket.
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(appointment_datetime, '%Y-%m') AS month, COUNT(*) AS count
     FROM appointments
     WHERE ${where.join(' AND ')}
     GROUP BY month
     ORDER BY month ASC`,
    params
  );
  return rows.map((r) => ({ month: r.month, count: Number(r.count) }));
}

/** Distinct patients per department (bar chart). */
async function patientsByDepartment(doctorId) {
  const where = doctorId ? 'WHERE doctor_id = ?' : '';
  const params = doctorId ? [doctorId] : [];
  // COUNT(DISTINCT patient_id): a patient can have several visits in a
  // department, but we want to count each patient once.
  const [rows] = await pool.query(
    `SELECT department, COUNT(DISTINCT patient_id) AS patient_count
     FROM visits
     ${where}
     GROUP BY department
     ORDER BY patient_count DESC`,
    params
  );
  return rows.map((r) => ({ department: r.department, patientCount: Number(r.patient_count) }));
}

/** Appointment counts by status — scheduled/completed/cancelled/no_show (pie). */
async function statusBreakdown(doctorId) {
  const where = doctorId ? 'WHERE doctor_id = ?' : '';
  const params = doctorId ? [doctorId] : [];
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM appointments
     ${where}
     GROUP BY status`,
    params
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

/** Most frequent diagnosis codes (table), top 10. */
async function topDiagnoses(doctorId) {
  const where = doctorId ? 'WHERE doctor_id = ?' : '';
  const params = doctorId ? [doctorId] : [];
  const [rows] = await pool.query(
    `SELECT diagnosis_code, COUNT(*) AS count
     FROM visits
     ${where}
     GROUP BY diagnosis_code
     ORDER BY count DESC
     LIMIT 10`,
    params
  );
  return rows.map((r) => ({ diagnosisCode: r.diagnosis_code, count: Number(r.count) }));
}

/**
 * GET /api/analytics/overview
 * Runs all four aggregations in parallel and returns them together so the
 * dashboard needs just one request.
 */
async function overview(req, res) {
  const doctorId = req.user.role === 'doctor' ? req.user.id : null;

  const [byMonth, byDepartment, byStatus, diagnoses] = await Promise.all([
    appointmentsByMonth(doctorId),
    patientsByDepartment(doctorId),
    statusBreakdown(doctorId),
    topDiagnoses(doctorId),
  ]);

  res.json({
    data: {
      scope: doctorId ? 'doctor' : 'all',
      appointmentsByMonth: byMonth,
      patientsByDepartment: byDepartment,
      statusBreakdown: byStatus,
      topDiagnoses: diagnoses,
    },
  });
}

module.exports = { overview };
