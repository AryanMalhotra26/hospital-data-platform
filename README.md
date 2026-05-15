# Hospital Data Management Platform

A full-stack, role-based web platform for managing structured healthcare data — patients, staff, appointments, and clinical records — with secure authentication, optimized MySQL queries, and analytics dashboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Axios, Chart.js |
| Backend | Node.js, Express |
| Database | MySQL (indexed queries) |
| Auth | JWT (role-based access control) |
| API | REST |

## Architecture

```
React Frontend
      │
      ▼
Express REST API ──► JWT Auth Middleware ──► Role Guard
      │
      ▼
MySQL Database (patients, staff, appointments, records)
      │
      ▼
Analytics Aggregation Layer ──► Dashboard Charts
```

## Roles & Permissions

| Role | Access |
|------|--------|
| Admin | Full CRUD on all entities, user management |
| Doctor | View/update patient records and appointments |
| Nurse | View assigned patients, update vitals |
| Receptionist | Manage appointments, view patient info |

## Key Features

- **Secure authentication** — JWT-based login with role-aware access control enforced server-side
- **Patient management** — Create, update, and archive patient profiles with full medical history
- **Appointment scheduling** — Conflict-free booking with doctor availability checks
- **Analytics dashboards** — Real-time charts (admissions, appointments, patient trends) via Chart.js
- **Optimized queries** — MySQL indexing on frequently queried columns (patient ID, doctor ID, date ranges), reducing query times significantly
- **Query indexing** — Composite indexes for complex multi-join queries across patient/appointment/record tables

## Database Schema (simplified)

```sql
patients        (id, name, dob, gender, blood_type, created_at)
staff           (id, name, role, department, email)
appointments    (id, patient_id, doctor_id, scheduled_at, status)
medical_records (id, patient_id, doctor_id, diagnosis, notes, created_at)
```

## Setup

```bash
git clone https://github.com/AryanMalhotra26/hospital-data-platform.git
cd hospital-data-platform

# Backend
cd server && npm install
cp .env.example .env   # Add MySQL credentials and JWT secret
npm start              # Runs on :5000

# Frontend
cd ../client && npm install
npm start              # Runs on :3000
```

## Results

- Role-based access control enforced across all 20+ API endpoints
- Optimized SQL queries with indexing reduced dashboard load time significantly
- Analytics dashboards provide real-time visibility into patient and appointment data
