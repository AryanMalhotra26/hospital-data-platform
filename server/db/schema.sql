-- ============================================================================
--  Hospital Data Management Platform — Database Schema
-- ----------------------------------------------------------------------------
--  Engine:  InnoDB  (required for FOREIGN KEY support + row-level locking)
--  Charset: utf8mb4 (full Unicode, including names/emojis; 4-byte safe)
--
--  Load with:
--    mysql -u root -p < server/db/schema.sql
--  (then load seed.sql the same way)
--
--  Design notes are inline. The two questions to keep in mind while reading:
--    1. Every FOREIGN KEY column is indexed — InnoDB needs an index on the
--       referencing column anyway, and all of ours are also used in JOINs.
--    2. We only add EXTRA (non-FK) indexes on columns we actually filter,
--       group, or sort by in the API/analytics. Indexes speed up reads but
--       cost write time + storage, so we don't index "just in case".
-- ============================================================================

-- Create the database and switch into it. Idempotent so the script can be
-- re-run during development.
CREATE DATABASE IF NOT EXISTS hospital_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- Drop in reverse dependency order so foreign keys don't block the drop.
-- (Children first, then parents.) Safe to re-run.
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;

-- ----------------------------------------------------------------------------
-- users
--   Staff accounts. Three roles drive all access control on the backend.
--   A "doctor" row is both a login AND the entity patients/appointments
--   reference as their doctor — i.e. doctors live in `users`, not a separate
--   table. This keeps "the logged-in doctor" and "the assigned doctor" the
--   same id, which is exactly what the role middleware compares.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  -- Login identifier. UNIQUE both enforces "one account per email" AND gives
  -- us the index that every login query (`WHERE email = ?`) relies on.
  email         VARCHAR(255) NOT NULL,
  -- bcrypt output is always 60 chars; 255 leaves headroom and is the common
  -- convention. We store ONLY the hash, never the plaintext password.
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'doctor', 'receptionist') NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  -- The "assign a doctor" dropdowns and the doctor-list endpoint filter by
  -- role = 'doctor'. Low cardinality (3 values), but the table is tiny and
  -- the lookup is frequent, so the index pays for itself here.
  KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- patients
--   Each patient is optionally assigned to one doctor. A Doctor only ever
--   sees patients where assigned_doctor_id = their own user id — that filter
--   is the whole reason assigned_doctor_id is indexed.
-- ----------------------------------------------------------------------------
CREATE TABLE patients (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120) NOT NULL,
  dob                DATE NULL,
  gender             ENUM('male', 'female', 'other') NULL,
  phone              VARCHAR(20) NULL,
  assigned_doctor_id INT UNSIGNED NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- Indexed because: (a) it's a FK, and (b) it's the Doctor-role filter
  -- `WHERE assigned_doctor_id = ?` on what becomes the largest "people" table.
  KEY idx_patients_doctor (assigned_doctor_id),

  -- If a doctor's user row is deleted, keep the patient but null out the
  -- assignment rather than deleting the patient (data retention matters in a
  -- clinical context). An admin can reassign later.
  CONSTRAINT fk_patients_doctor
    FOREIGN KEY (assigned_doctor_id) REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- appointments
--   A scheduled visit between one patient and one doctor.
--   NOTE: the column is `appointment_datetime`, not `datetime`. `DATETIME` is
--   a MySQL type keyword; naming a column `datetime` works only when quoted
--   and constantly trips people up, so we use an unambiguous name.
-- ----------------------------------------------------------------------------
CREATE TABLE appointments (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id           INT UNSIGNED NOT NULL,
  doctor_id            INT UNSIGNED NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  -- The analytics pie chart breaks down exactly these states.
  status               ENUM('scheduled', 'completed', 'cancelled', 'no_show')
                         NOT NULL DEFAULT 'scheduled',
  notes                TEXT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- FK + JOIN to patients (e.g. "show patient name on the appointment list").
  KEY idx_appointments_patient (patient_id),

  -- Composite index: the single most common access pattern is "this doctor's
  -- appointments, ordered/filtered by date" (a doctor opening their schedule).
  -- (doctor_id, appointment_datetime) serves BOTH `WHERE doctor_id = ?` alone
  -- AND `WHERE doctor_id = ? ORDER BY appointment_datetime` without a filesort,
  -- because of the leftmost-prefix rule. It also satisfies the FK on doctor_id.
  KEY idx_appointments_doctor_datetime (doctor_id, appointment_datetime),

  -- Standalone date index for the admin-wide "appointments per month" rollup,
  -- which groups across ALL doctors and therefore can't use the composite above.
  KEY idx_appointments_datetime (appointment_datetime),

  -- We deliberately do NOT index `status` on its own: only 4 distinct values,
  -- so the optimizer would usually scan the table anyway. Status is cheap to
  -- aggregate without an index, and indexing it would only slow writes.

  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE       -- deleting a patient removes their appointments
    ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- visits
--   Completed clinical encounters — the analytics fact table. Kept separate
--   from `appointments` on purpose: an appointment is an intent to be seen
--   (and may be cancelled/no-show), while a visit is a recorded encounter with
--   a diagnosis and a department. Analytics aggregate over visits.
--
--   `department` is stored denormalized (a string) rather than as a FK to a
--   departments table. Tradeoff: simpler to seed/query and good enough for a
--   fixed list, at the cost of no referential integrity on department names.
--   For a real system you'd normalize this into a `departments` lookup.
-- ----------------------------------------------------------------------------
CREATE TABLE visits (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id     INT UNSIGNED NOT NULL,
  doctor_id      INT UNSIGNED NOT NULL,
  visit_date     DATE NOT NULL,
  -- ICD-10-style code, e.g. 'E11.9' (Type 2 diabetes). Short, fixed-ish width.
  diagnosis_code VARCHAR(10) NOT NULL,
  department     VARCHAR(60) NOT NULL,

  PRIMARY KEY (id),

  -- FK + "this patient's visit history" lookups.
  KEY idx_visits_patient (patient_id),
  -- FK + per-doctor analytics scoping.
  KEY idx_visits_doctor (doctor_id),
  -- "Patient count by department" groups by department.
  KEY idx_visits_department (department),
  -- "Top diagnoses by frequency" groups by diagnosis_code.
  KEY idx_visits_diagnosis (diagnosis_code),
  -- Date-range filtering for time-series analytics (e.g. last 12 months).
  KEY idx_visits_date (visit_date),

  CONSTRAINT fk_visits_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_visits_doctor
    FOREIGN KEY (doctor_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
