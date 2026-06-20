# Hospital Data Management Platform

A full-stack, role-based web application for managing hospital data — staff, patients,
appointments, and clinical visit records — with JWT authentication, role-based access
control enforced on the **backend**, and SQL-powered analytics dashboards.

> Built incrementally in 7 steps. Each entity, query, and access rule is documented so
> the codebase is easy to maintain and extend.

---

## Features

- **Role-based access control (RBAC)** with three roles — **Admin**, **Doctor**,
  **Receptionist** — enforced by Express middleware on every protected route (the React
  guards are a secondary UX layer only).
- **JWT auth** with `bcrypt` password hashing; the token is held in React memory
  (not `localStorage`) to reduce XSS token-theft risk.
- **CRUD** for patients and appointments, plus admin user management, with row-level
  scoping (a doctor only ever touches their own patients/appointments) and field-level
  rules (a receptionist can't write clinical notes).
- **Analytics dashboard** (Recharts) backed by SQL `GROUP BY`/date aggregations — not
  computed in JavaScript: appointments per month (line), patients by department (bar),
  appointment-status breakdown (pie), and top diagnoses (table).

---

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 (Vite), React Router 6, native `fetch`, plain CSS |
| Charts    | Recharts |
| Backend   | Node.js, Express (REST API) |
| Database  | MySQL 8+ via the `mysql2` driver (connection pooling) |
| Auth      | JWT access tokens (`jsonwebtoken`), `bcryptjs` hashing |
| Validation| `express-validator` |

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────────────┐
│  React (Vite) — :5173        │         │  Express REST API — :4000                  │
│                              │         │                                            │
│  AuthContext (JWT in memory) │  HTTPS  │  helmet · cors · json                      │
│  apiFetch ── Bearer token ───┼────────►│  authenticate ─► requireRole ─► controller │
│  ProtectedRoute guards       │  JSON   │       (verify JWT)   (role gate)  (logic)  │
│  Pages: Login, Patients,     │◄────────┤                          │                 │
│  Appointments, Dashboard     │         │           row/field-level checks           │
└─────────────────────────────┘         │                          │                 │
                                         │                   mysql2 pool               │
                                         └──────────────────────────┬─────────────────┘
                                                                    │ SQL (GROUP BY,
                                                                    ▼  JOINs, indexes)
                                                        ┌───────────────────────────┐
                                                        │  MySQL: users, patients,   │
                                                        │  appointments, visits      │
                                                        └───────────────────────────┘
```

Request pipeline for a protected route: **JWT verification → role gate → controller**,
where the controller adds data-dependent checks (ownership, field permissions) and runs
parameterized SQL through the pool.

---

## Repository structure

```
.
├── README.md
├── .env.example                 # documents server env vars (copy to server/.env)
├── client/                      # React (Vite) frontend
│   └── src/
│       ├── api/client.js        # fetch wrapper (attaches Bearer token)
│       ├── context/AuthContext.jsx   # in-memory JWT, login/logout/authFetch
│       ├── components/          # Layout, ProtectedRoute, Modals, AnalyticsDashboard
│       └── pages/               # Login, Dashboard, Patients, Appointments, Users
└── server/                      # Express backend
    ├── db/
    │   ├── schema.sql           # tables, foreign keys, indexes
    │   ├── seed.sql             # generated demo data (deterministic)
    │   └── generate_seed.js     # regenerates seed.sql
    └── src/
        ├── config/env.js        # fail-fast env loading
        ├── db/pool.js           # mysql2 connection pool
        ├── middleware/          # auth (authenticate, requireRole), validate, errors
        ├── controllers/         # auth, patients, appointments, users, analytics
        ├── routes/              # one router per resource
        └── validators/          # express-validator rule sets
```

---

## Data model

```
users(id, name, email, password_hash, role)                              role ∈ {admin, doctor, receptionist}
patients(id, name, dob, gender, phone, assigned_doctor_id → users.id)
appointments(id, patient_id → patients.id, doctor_id → users.id,
             appointment_datetime, status, notes)                         status ∈ {scheduled, completed, cancelled, no_show}
visits(id, patient_id → patients.id, doctor_id → users.id,
       visit_date, diagnosis_code, department)                            -- analytics fact table
```

- **Doctors live in `users`** (not a separate table), so "the logged-in doctor" and "the
  assigned doctor" share one id — exactly what the RBAC middleware compares.
- **`appointments` vs `visits`**: an appointment is an *intent* (can be cancelled/no-show);
  a visit is a *recorded* clinical encounter with a diagnosis. Analytics aggregate `visits`.
- **Indexes** match the access patterns: FK columns; a composite
  `(doctor_id, appointment_datetime)` for a doctor's schedule; `visits.department` and
  `visits.diagnosis_code` for the `GROUP BY` analytics. `appointments.status` is left
  unindexed on purpose (only 4 distinct values → an index wouldn't help).

---

## Roles & permissions (enforced on the backend)

| Action | Admin | Doctor | Receptionist |
|---|---|---|---|
| Patients — list/view | all | **own assigned only** | all |
| Patients — create | ✅ | ❌ | ✅ |
| Patients — update | any | own only (not reassignment) | ❌ |
| Patients — delete | ✅ | ❌ | ❌ |
| Appointments — list/view | all | **own only** | all |
| Appointments — create | ✅ | own patients only | ✅ (no clinical notes) |
| Appointments — update | any | own only | reschedule/status, **no notes** |
| Appointments — delete | ✅ | own only | ❌ |
| Users — CRUD | ✅ | ❌ | ❌ |
| Analytics | all data | scoped to self | ❌ |

---

## Local setup

### Prerequisites
- **Node.js 18+** and npm
- **MySQL 8+** running locally

### 1. Clone & install dependencies
```bash
git clone https://github.com/AryanMalhotra26/hospital-data-platform.git
cd hospital-data-platform

# Backend deps
cd server && npm install

# Frontend deps
cd ../client && npm install
cd ..
```

### 2. Create the database, load schema + seed
`schema.sql` creates the `hospital_db` database and its tables; `seed.sql` fills it with
demo data (7 users, 50 patients, 200 appointments, 300 visits across 12 months).

```bash
# Run as a MySQL user that can create databases (e.g. root):
mysql -u root -p < server/db/schema.sql
mysql -u root -p < server/db/seed.sql
```

Create a **least-privilege** application user for the API (DML only — no DDL):
```sql
-- in a `mysql -u root -p` shell:
CREATE USER 'hospital_app'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON hospital_db.* TO 'hospital_app'@'localhost';
FLUSH PRIVILEGES;
```

*(Optional) regenerate the seed deterministically:* `node server/db/generate_seed.js`

### 3. Configure the backend environment
```bash
cp .env.example server/.env
```
Edit `server/.env` with your DB credentials and a strong JWT secret:
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=hospital_app
DB_PASSWORD=choose_a_password
DB_NAME=hospital_db

JWT_SECRET=<a long random string>   # e.g. node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_EXPIRES_IN=1h

PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### 4. Run both servers (two terminals)
```bash
# Terminal 1 — API on http://localhost:4000
cd server && npm run dev      # nodemon (or `npm start`)

# Terminal 2 — web app on http://localhost:5173
cd client && npm run dev
```
Open **http://localhost:5173** and log in with a demo account below. Sanity-check the API
with `curl http://localhost:4000/api/health` → `{"status":"ok","db":"up"}`.

---

## Demo accounts

All seeded accounts share the password **`Password123!`**.

| Role | Email | Sees |
|---|---|---|
| Admin | `admin@hospital.test` | everything + global analytics |
| Doctor | `dr.chen@hospital.test` | only their patients/appointments + scoped analytics |
| Receptionist | `reception@hospital.test` | patient registration + appointment booking |

Other doctors: `dr.reed@`, `dr.khan@`, `dr.okafor@`, `dr.rossi@hospital.test`.

---

## API reference

Base URL: `http://localhost:4000/api`. All routes except `/health` and `/auth/*` require an
`Authorization: Bearer <token>` header.

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/health` | public | liveness + DB check |
| POST | `/auth/register` | public | self-signup; **receptionist only** (prevents privilege escalation) |
| POST | `/auth/login` | public | returns `{ token, user }` |
| GET | `/patients` | all roles | doctor scoped to own |
| GET/POST/PUT/DELETE | `/patients/:id?` | per RBAC table | |
| GET | `/appointments` | all roles | `?status=` & `?patientId=` filters; doctor scoped |
| GET/POST/PUT/DELETE | `/appointments/:id?` | per RBAC table | |
| GET | `/users/doctors` | all roles | doctor dropdowns |
| GET/POST/PUT/DELETE | `/users/:id?` | **admin only** | |
| GET | `/analytics/overview` | admin, doctor | all four aggregations in one response |

---

## Analytics — the SQL behind it

All metrics are computed by the database (`GROUP BY` + `COUNT` + date functions), never by
looping over rows in Node. (`?` = optional `doctor_id` filter when a doctor is the caller.)

```sql
-- Appointments per month (line chart) — 12-month window anchored to the latest data
SELECT DATE_FORMAT(appointment_datetime, '%Y-%m') AS month, COUNT(*) AS count
FROM appointments
WHERE appointment_datetime >= DATE_SUB(
        DATE_FORMAT((SELECT MAX(appointment_datetime) FROM appointments), '%Y-%m-01'),
        INTERVAL 11 MONTH)
GROUP BY month ORDER BY month;          -- uses idx_appointments_datetime

-- Patients by department (bar chart) — count each patient once per department
SELECT department, COUNT(DISTINCT patient_id) AS patient_count
FROM visits GROUP BY department ORDER BY patient_count DESC;   -- uses idx_visits_department

-- Appointment status breakdown (pie chart)
SELECT status, COUNT(*) AS count FROM appointments GROUP BY status;
-- status is intentionally NOT indexed (4 values → low selectivity)

-- Top diagnoses by frequency (table)
SELECT diagnosis_code, COUNT(*) AS count
FROM visits GROUP BY diagnosis_code ORDER BY count DESC LIMIT 10;  -- uses idx_visits_diagnosis
```

---

## Security notes

- **RBAC is enforced server-side.** Frontend guards only shape the UI; every protected
  endpoint re-checks the role (and ownership) so a crafted request can't bypass it.
- **JWT in memory, not `localStorage`.** Avoids long-lived token theft via XSS; the cost is
  that a page refresh logs you out. Production next step: short-lived access token + an
  `httpOnly` refresh-token cookie.
- **`bcrypt` hashing** (cost 10); login returns an identical generic 401 for unknown-email
  vs. wrong-password (no user enumeration) and runs a constant-time compare.
- **Mass-assignment defenses.** Public `/auth/register` ignores any role and creates a
  receptionist; a doctor booking is forced to themselves regardless of the submitted
  `doctor_id`.
- **Parameterized queries** everywhere (no string-built SQL) and a least-privilege DB user.

---

## Known limitations / next steps
- Refresh-token flow for seamless sessions across page reloads.
- Appointment time-conflict detection (double-booking checks).
- Lazy-load the analytics route (`React.lazy`) to trim the Recharts bundle off the login path.
- Normalize `visits.department` into a lookup table for referential integrity.
- Automated test suite (the RBAC rules were validated with a scripted smoke test during development).
- Rate limiting on `/auth/*`.
```
