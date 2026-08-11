-- ============================================================================
--  Hospital Data Management Platform — LARGE synthetic dataset
-- ----------------------------------------------------------------------------
--  Generates ~1.3M rows directly inside MySQL, in ~15 seconds.
--
--  Load with (schema.sql must already have been run):
--    mysql -u root -p < server/db/seed_large.sql
--
--  WHY THIS EXISTS
--  ---------------
--  `seed.sql` holds a 550-row demo dataset — enough to click through the UI,
--  but far too small to tell you anything about performance. Under a few
--  thousand rows the optimizer will often ignore an index entirely, because a
--  full scan of a table that fits in one or two pages really is cheaper. Every
--  indexing decision documented in schema.sql is therefore untestable at that
--  size.
--
--  This script fills the same schema to a size where those decisions actually
--  show up in EXPLAIN: a doctor's schedule stops being a table scan, GROUP BY
--  starts leaning on the covering indexes, and the un-paginated list endpoints
--  become visibly expensive. See the "Performance at scale" section of the
--  README for the measured numbers.
--
--  WHY SQL AND NOT generate_seed.js
--  --------------------------------
--  A 1.3M-row seed written as INSERT literals would be a ~150 MB file — absurd
--  to keep in git. Generating the rows inside the server with INSERT ... SELECT
--  keeps this file a few KB and makes it far faster to load.
--
--  DETERMINISTIC ON PURPOSE
--  ------------------------
--  Like generate_seed.js, this uses no RAND(). Every value is a pure function
--  of the row number, so two people running it get byte-identical databases and
--  can compare query plans meaningfully.
--
--  ⚠️  This DELETES all existing rows in the four tables before loading.
-- ============================================================================

USE hospital_db;

-- ── Scale knobs ─────────────────────────────────────────────────────────────
-- Turn these down for a quicker load; the script works at any size.
SET @doctors      = 200;
SET @receptionists = 20;
SET @patients     = 50000;
SET @appointments = 500000;
SET @visits       = 750000;

-- Anchor date for the ~13-month window the data spans.
SET @start_date = '2025-07-01';

-- FK checks off purely for load speed — the generated ids are all valid by
-- construction, and we turn them back on (and verify) at the end.
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

DELETE FROM visits;
DELETE FROM appointments;
DELETE FROM patients;
DELETE FROM users;
ALTER TABLE users        AUTO_INCREMENT = 1;
ALTER TABLE patients     AUTO_INCREMENT = 1;
ALTER TABLE appointments AUTO_INCREMENT = 1;
ALTER TABLE visits       AUTO_INCREMENT = 1;

-- ----------------------------------------------------------------------------
-- A 1,000,000-row number generator.
--   Cross-joining six copies of a 10-row digits table gives us 0..999999 in a
--   single statement — much faster than looping, and it needs no stored
--   procedure. Everything below is driven off `nums.n`.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS nums;
DROP TABLE IF EXISTS digits;

CREATE TABLE digits (i INT);
INSERT INTO digits VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

CREATE TABLE nums (n INT PRIMARY KEY);
INSERT INTO nums
SELECT a.i + b.i*10 + c.i*100 + d.i*1000 + e.i*10000 + f.i*100000
FROM digits a, digits b, digits c, digits d, digits e, digits f;

-- ----------------------------------------------------------------------------
-- users
--   id 1                        -> admin
--   ids 2 .. (@doctors+1)       -> doctors      (contiguous, so `2 + (n % N)`
--                                                below always lands on a doctor)
--   the rest                    -> receptionists
--
--   Every account shares one real bcrypt hash of "Password123!" (cost 10) —
--   bcrypt can't run in SQL, so the hash is precomputed. Fine for a demo
--   dataset, never for anything real.
-- ----------------------------------------------------------------------------
SET @pw = '$2a$10$9ABb1pbdm8R2h6u6dMAtFekQ9ZdIwDLF1DHDClLjaS5IqxjeqMCTa';

INSERT INTO users (id, name, email, password_hash, role)
VALUES (1, 'Admin User', 'admin@hospital.test', @pw, 'admin');

INSERT INTO users (id, name, email, password_hash, role)
SELECT n + 2,
       CONCAT('Dr. ', ELT(1 + (n % 10), 'Patel','Chen','Okafor','Silva','Novak',
                                        'Haddad','Kaur','Rossi','Muller','Tanaka'),
              ' ', n + 1),
       CONCAT('doctor', n + 1, '@hospital.test'),
       @pw, 'doctor'
FROM nums WHERE n < @doctors;

INSERT INTO users (id, name, email, password_hash, role)
SELECT n + 2 + @doctors,
       CONCAT('Reception Desk ', n + 1),
       CONCAT('reception', n + 1, '@hospital.test'),
       @pw, 'receptionist'
FROM nums WHERE n < @receptionists;

-- ----------------------------------------------------------------------------
-- patients
--   Round-robin assignment across doctors, so each doctor owns a roughly equal
--   slice — that keeps `WHERE assigned_doctor_id = ?` selective enough for the
--   index on it to be the obvious plan.
-- ----------------------------------------------------------------------------
INSERT INTO patients (id, name, dob, gender, phone, assigned_doctor_id)
SELECT n + 1,
       CONCAT('Patient ', n + 1),
       DATE_SUB('2006-01-01', INTERVAL (n % 21900) DAY),   -- ages ~0-60
       ELT(1 + (n % 3), 'male', 'female', 'other'),
       CONCAT('555', LPAD(n % 10000000, 7, '0')),
       2 + (n % @doctors)
FROM nums WHERE n < @patients;

-- ----------------------------------------------------------------------------
-- appointments
--   Multiplying by a prime (7919) before the modulo scatters patients across
--   the table instead of leaving them in long contiguous runs — otherwise the
--   patient_id index would look artificially well-clustered.
-- ----------------------------------------------------------------------------
INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, status, notes)
SELECT 1 + ((n * 7919) % @patients),
       2 + (n % @doctors),
       DATE_ADD(CONCAT(@start_date, ' 08:00:00'),
                INTERVAL ((n % 400) * 1440 + (n % 480)) MINUTE),
       ELT(1 + (n % 4), 'scheduled', 'completed', 'cancelled', 'no_show'),
       NULL
FROM nums WHERE n < @appointments;

-- ----------------------------------------------------------------------------
-- visits — the analytics fact table (see schema.sql for why it's separate).
-- ----------------------------------------------------------------------------
INSERT INTO visits (patient_id, doctor_id, visit_date, diagnosis_code, department)
SELECT 1 + ((n * 7919) % @patients),
       2 + (n % @doctors),
       DATE_ADD(@start_date, INTERVAL (n % 400) DAY),
       ELT(1 + (n % 15), 'E11.9','I10','J45.909','M54.5','K21.9','F41.1','N39.0',
                         'R51.9','J06.9','E78.5','I25.10','G43.909','L20.9',
                         'B34.9','R10.9'),
       ELT(1 + (n % 8), 'Cardiology','Oncology','Neurology','Orthopaedics',
                        'Paediatrics','Emergency','Radiology','General Medicine')
FROM nums WHERE n < @visits;

DROP TABLE nums;
DROP TABLE digits;

SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;

-- Refresh index statistics so the optimizer costs plans against the real row
-- counts. Skipping this is a classic way to get a confusing EXPLAIN right after
-- a bulk load.
ANALYZE TABLE users, patients, appointments, visits;

SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'patients',     COUNT(*) FROM patients
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'visits',       COUNT(*) FROM visits;
