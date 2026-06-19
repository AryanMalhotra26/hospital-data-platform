/**
 * AppointmentsPage — lists appointments with a status filter, inline status
 * changes, and booking/edit/delete.
 *
 * Role shaping (backend still enforces):
 *   - Book: everyone (the modal hides fields they may not set).
 *   - Inline status change: everyone, for appointments they can see.
 *   - Edit: everyone (field-level limits live in the modal/backend).
 *   - Delete: admin, or the owning doctor. Receptionists cancel via status.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, STATUS_LABELS, STATUS_OPTIONS } from '../utils/format';
import AppointmentFormModal from '../components/AppointmentFormModal';

export default function AppointmentsPage() {
  const { user, authFetch } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // appointment, 'new', or null
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apptPath = statusFilter ? `/appointments?status=${statusFilter}` : '/appointments';
      const [apptRes, patientsRes, doctorsRes] = await Promise.all([
        authFetch(apptPath),
        authFetch('/patients'), // booking dropdown (doctor gets only their own)
        authFetch('/users/doctors'),
      ]);
      setAppointments(apptRes.data);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const canDelete = (appt) => user.role === 'admin' || (user.role === 'doctor' && appt.doctor_id === user.id);

  async function changeStatus(appt, status) {
    try {
      await authFetch(`/appointments/${appt.id}`, { method: 'PUT', body: { status } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(appt) {
    if (!window.confirm(`Delete the appointment for ${appt.patient_name}?`)) return;
    try {
      await authFetch(`/appointments/${appt.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setEditing(null);
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 className="page__title">Appointments</h1>
          <p className="page__subtitle" style={{ margin: 0 }}>
            {loading ? 'Loading…' : `${appointments.length} shown`}
          </p>
        </div>
        <div className="toolbar__controls">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            + Book appointment
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!loading && appointments.length === 0 ? (
        <div className="placeholder">No appointments to show.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Notes</th>
                <th className="table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.appointment_datetime)}</td>
                  <td>{a.patient_name}</td>
                  <td>{a.doctor_name}</td>
                  <td>
                    {/* Inline status change (a small partial-update PUT). */}
                    <select
                      className={`status-select status--${a.status}`}
                      value={a.status}
                      onChange={(e) => changeStatus(a, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="notes-cell">{a.notes || <span className="muted">—</span>}</td>
                  <td className="table__actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing(a)}>
                      Edit
                    </button>
                    {canDelete(a) && (
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(a)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <AppointmentFormModal
          appointment={editing === 'new' ? null : editing}
          patients={patients}
          doctors={doctors}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
