/**
 * generate_seed.js
 * ----------------------------------------------------------------------------
 * Generates server/db/seed.sql — realistic, DETERMINISTIC fake data:
 *   - 1 admin, 5 doctors, 1 receptionist        (users)
 *   - 50 patients                                (patients)
 *   - 200 appointments over the last ~12 months  (appointments)
 *   - 300 clinical visits over the last 12 months (visits)
 *
 * Why a generator instead of hand-written INSERTs?
 *   - 550+ rows by hand is error-prone and unreviewable.
 *   - A seeded PRNG makes the output 100% reproducible: re-running this script
 *     produces byte-identical seed.sql, so the data in everyone's DB matches.
 *   - The RULES (how a doctor relates to their patients/visits) live in code
 *     where they can be read, instead of being buried in opaque literals.
 *
 * Uses ONLY Node built-ins (no npm install needed):
 *   node server/db/generate_seed.js
 *
 * The bcrypt hash below is a REAL hash of the demo password "Password123!"
 * (bcrypt, cost 10). bcrypt can't run in SQL, so we embed a precomputed hash.
 * Every demo account shares this password — fine for a demo, never for prod.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Real bcrypt hash of "Password123!" (cost 10). Each demo user reuses it.
const DEMO_PASSWORD_HASH = '$2a$10$9ABb1pbdm8R2h6u6dMAtFekQ9ZdIwDLF1DHDClLjaS5IqxjeqMCTa';

// "Today" anchors the 12-month window. Fixed so output stays deterministic.
const TODAY = new Date('2026-06-19T00:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// A tiny seedable RNG so the data is identical on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260619); // any fixed seed

const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const choice = (arr) => arr[Math.floor(rand() * arr.length)];
// Weighted choice: items = [[value, weight], ...]
function weighted(items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of items) {
    if ((r -= w) < 0) return value;
  }
  return items[items.length - 1][0];
}

// ── Date helpers ─────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
function fmtDate(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}
// Random date `dayOffset` is relative to TODAY (negative = past, positive = future).
function dateFromOffset(dayOffset) {
  return new Date(TODAY.getTime() + dayOffset * DAY_MS);
}

// ── Escaping ─────────────────────────────────────────────────────────────────
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ── Reference data ───────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph',
  'Jessica', 'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy',
  'Matthew', 'Lisa', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Dorothy', 'Edward', 'Melissa',
  'Ronald', 'Deborah', 'Priya', 'Wei',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Patel',
];

// Departments aggregated by the analytics "patients by department" chart.
const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Oncology',
  'Dermatology', 'General Medicine', 'Emergency', 'Gynecology', 'Radiology',
];

// ICD-10-style codes. Comments are the human labels the frontend maps for the
// "top diagnoses" table.
const DIAGNOSES = [
  'E11.9',   // Type 2 diabetes mellitus
  'I10',     // Essential (primary) hypertension
  'J45.909', // Asthma, unspecified
  'M54.5',   // Low back pain
  'K21.9',   // GERD
  'F41.9',   // Anxiety disorder, unspecified
  'J06.9',   // Acute upper respiratory infection
  'N39.0',   // Urinary tract infection
  'R51',     // Headache
  'E78.5',   // Hyperlipidemia, unspecified
  'I25.10',  // Atherosclerotic heart disease
  'G43.909', // Migraine, unspecified
  'L30.9',   // Dermatitis, unspecified
  'C50.911', // Malignant neoplasm of breast
  'S93.401', // Sprain of unspecified ligament of ankle
];

// The 5 doctors and their primary department. Their user ids will be 2..6
// because the admin (id 1) is inserted first, then doctors in this order.
const DOCTORS = [
  { name: 'Dr. Sarah Chen', email: 'dr.chen@hospital.test', dept: 'Cardiology' },
  { name: 'Dr. Marcus Reed', email: 'dr.reed@hospital.test', dept: 'Neurology' },
  { name: 'Dr. Aisha Khan', email: 'dr.khan@hospital.test', dept: 'Pediatrics' },
  { name: 'Dr. David Okafor', email: 'dr.okafor@hospital.test', dept: 'Orthopedics' },
  { name: 'Dr. Elena Rossi', email: 'dr.rossi@hospital.test', dept: 'Oncology' },
];

// ── Build USERS ──────────────────────────────────────────────────────────────
// Insert order fixes the auto-increment ids: admin=1, doctors=2..6, recept=7.
const users = [];
users.push({ id: 1, name: 'Alice Admin', email: 'admin@hospital.test', role: 'admin' });
const doctorIds = [];
DOCTORS.forEach((d, i) => {
  const id = 2 + i;
  doctorIds.push(id);
  users.push({ id, name: d.name, email: d.email, role: 'doctor', dept: d.dept });
});
const RECEPTIONIST_ID = 2 + DOCTORS.length; // 7
users.push({ id: RECEPTIONIST_ID, name: 'Rita Reception', email: 'reception@hospital.test', role: 'receptionist' });

const doctorDeptById = {};
users.filter((u) => u.role === 'doctor').forEach((u) => (doctorDeptById[u.id] = u.dept));

// ── Build PATIENTS ───────────────────────────────────────────────────────────
const PATIENT_COUNT = 50;
const patients = [];
const usedNames = new Set();
for (let i = 1; i <= PATIENT_COUNT; i++) {
  let name;
  do {
    name = `${choice(FIRST_NAMES)} ${choice(LAST_NAMES)}`;
  } while (usedNames.has(name));
  usedNames.add(name);

  // dob between 1940-01-01 and 2015-12-31
  const dob = new Date(Date.UTC(randInt(1940, 2015), randInt(0, 11), randInt(1, 28)));
  const gender = weighted([['male', 48], ['female', 48], ['other', 4]]);
  const phone = `(${randInt(200, 989)}) ${randInt(200, 999)}-${pad(randInt(0, 99))}${pad(randInt(0, 99))}`;
  // Most patients are assigned to a doctor; ~8% left unassigned (realistic,
  // and exercises the ON DELETE SET NULL / admin-reassign path).
  const assigned = rand() < 0.08 ? null : choice(doctorIds);

  patients.push({ id: i, name, dob: fmtDate(dob), gender, phone, assigned_doctor_id: assigned });
}

// Patients that DO have a doctor, so appointments/visits stay role-consistent
// (a doctor's appointments are with their own patients).
const assignedPatients = patients.filter((p) => p.assigned_doctor_id !== null);

// ── Build APPOINTMENTS ───────────────────────────────────────────────────────
const APPOINTMENT_COUNT = 200;
const appointments = [];
for (let i = 1; i <= APPOINTMENT_COUNT; i++) {
  const patient = choice(assignedPatients);
  const doctorId = patient.assigned_doctor_id;

  // ~82% in the past 12 months, ~18% upcoming (next 30 days).
  const isFuture = rand() < 0.18;
  const dayOffset = isFuture ? randInt(1, 30) : -randInt(0, 365);
  const d = dateFromOffset(dayOffset);
  d.setUTCHours(randInt(8, 16), choice([0, 15, 30, 45]), 0, 0);

  // Future = still scheduled. Past = mostly completed, some cancelled/no_show.
  const status = isFuture
    ? 'scheduled'
    : weighted([['completed', 64], ['cancelled', 18], ['no_show', 18]]);

  const notes =
    status === 'completed' && rand() < 0.4
      ? choice(['Follow-up in 3 months.', 'Prescription renewed.', 'Routine check, stable.', 'Referred for labs.'])
      : null;

  appointments.push({
    id: i,
    patient_id: patient.id,
    doctor_id: doctorId,
    appointment_datetime: fmtDateTime(d),
    status,
    notes,
  });
}

// ── Build VISITS ─────────────────────────────────────────────────────────────
const VISIT_COUNT = 300;
const visits = [];
for (let i = 1; i <= VISIT_COUNT; i++) {
  const patient = choice(assignedPatients);
  const doctorId = patient.assigned_doctor_id;

  // visit_date in the last 12 months
  const d = dateFromOffset(-randInt(0, 365));

  // 75% of visits land in the doctor's own department; 25% are cross-referrals
  // to another department, so the "by department" chart isn't trivially 1:1.
  const department = rand() < 0.75 ? doctorDeptById[doctorId] : choice(DEPARTMENTS);
  const diagnosis_code = choice(DIAGNOSES);

  visits.push({
    id: i,
    patient_id: patient.id,
    doctor_id: doctorId,
    visit_date: fmtDate(d),
    diagnosis_code,
    department,
  });
}

// ── Emit SQL ─────────────────────────────────────────────────────────────────
function insertHeader(table, cols) {
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES`;
}
function rowsToValues(rows) {
  return rows.map((r) => `  (${r.join(', ')})`).join(',\n') + ';\n';
}

let out = '';
out += '-- ============================================================================\n';
out += '--  Seed data — GENERATED by server/db/generate_seed.js. Do not edit by hand.\n';
out += '--  Re-generate with:  node server/db/generate_seed.js\n';
out += '--  Load with:         mysql -u root -p < server/db/seed.sql\n';
out += `--  Demo password for ALL accounts: Password123!\n`;
out += '-- ============================================================================\n\n';
out += 'USE hospital_db;\n\n';
out += '-- Make the seed idempotent: wipe existing rows and reset auto-increment so\n';
out += '-- ids below are stable. FK checks are toggled to allow truncation in any order.\n';
out += 'SET FOREIGN_KEY_CHECKS = 0;\n';
out += 'TRUNCATE TABLE visits;\n';
out += 'TRUNCATE TABLE appointments;\n';
out += 'TRUNCATE TABLE patients;\n';
out += 'TRUNCATE TABLE users;\n';
out += 'SET FOREIGN_KEY_CHECKS = 1;\n\n';

// users
out += insertHeader('users', ['id', 'name', 'email', 'password_hash', 'role']) + '\n';
out += rowsToValues(
  users.map((u) => [u.id, sqlStr(u.name), sqlStr(u.email), sqlStr(DEMO_PASSWORD_HASH), sqlStr(u.role)])
);
out += '\n';

// patients
out += insertHeader('patients', ['id', 'name', 'dob', 'gender', 'phone', 'assigned_doctor_id']) + '\n';
out += rowsToValues(
  patients.map((p) => [
    p.id,
    sqlStr(p.name),
    sqlStr(p.dob),
    sqlStr(p.gender),
    sqlStr(p.phone),
    p.assigned_doctor_id === null ? 'NULL' : p.assigned_doctor_id,
  ])
);
out += '\n';

// appointments
out += insertHeader('appointments', ['id', 'patient_id', 'doctor_id', 'appointment_datetime', 'status', 'notes']) + '\n';
out += rowsToValues(
  appointments.map((a) => [
    a.id,
    a.patient_id,
    a.doctor_id,
    sqlStr(a.appointment_datetime),
    sqlStr(a.status),
    a.notes === null ? 'NULL' : sqlStr(a.notes),
  ])
);
out += '\n';

// visits
out += insertHeader('visits', ['id', 'patient_id', 'doctor_id', 'visit_date', 'diagnosis_code', 'department']) + '\n';
out += rowsToValues(
  visits.map((v) => [
    v.id,
    v.patient_id,
    v.doctor_id,
    sqlStr(v.visit_date),
    sqlStr(v.diagnosis_code),
    sqlStr(v.department),
  ])
);

const outPath = path.join(__dirname, 'seed.sql');
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath}`);
console.log(`  users:        ${users.length}`);
console.log(`  patients:     ${patients.length} (${assignedPatients.length} assigned to a doctor)`);
console.log(`  appointments: ${appointments.length}`);
console.log(`  visits:       ${visits.length}`);
