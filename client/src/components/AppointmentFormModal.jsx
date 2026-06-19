/**
 * AppointmentFormModal — book a new appointment or edit an existing one.
 *
 * The form mirrors the backend RBAC so users don't hit avoidable 403s:
 *   - Doctor: the doctor is implicitly themselves (no doctor picker); the
 *     patient list they get back is already only their own patients.
 *   - Receptionist: no clinical "notes" field; on create the status is fixed to
 *     "scheduled" (no status picker).
 *   - On EDIT, patient/doctor can only be changed by an admin, so for everyone
 *     else those show as read-only text.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toDateTimeLocal, STATUS_LABELS, STATUS_OPTIONS } from '../utils/format';
import Modal from './Modal';

export default function AppointmentFormModal({ appointment, patients, doctors, onClose, onSaved }) {
  const { user, authFetch } = useAuth();
  const isEdit = Boolean(appointment);
  const role = user.role;

  const [form, setForm] = useState({
    patient_id: appointment?.patient_id ? String(appointment.patient_id) : '',
    doctor_id: appointment?.doctor_id ? String(appointment.doctor_id) : '',
    appointment_datetime: toDateTimeLocal(appointment?.appointment_datetime),
    status: appointment?.status || 'scheduled',
    notes: appointment?.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Field visibility/editability derived from role + mode.
  const showDoctorPicker = role !== 'doctor'; // doctors book as themselves
  const showNotes = role === 'admin' || role === 'doctor'; // not receptionist
  const showStatus = role === 'admin' || role === 'doctor' || isEdit; // receptionist: only when editing
  const canEditParties = role === 'admin'; // who can change patient/doctor on edit

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let payload;
      if (!isEdit) {
        // CREATE
        payload = {
          patient_id: Number(form.patient_id),
          appointment_datetime: form.appointment_datetime,
        };
        if (showDoctorPicker) payload.doctor_id = Number(form.doctor_id);
        if (showStatus) payload.status = form.status;
        if (showNotes && form.notes) payload.notes = form.notes;
      } else {
        // EDIT — only send the fields this role may change.
        payload = { appointment_datetime: form.appointment_datetime };
        if (showStatus) payload.status = form.status;
        if (showNotes) payload.notes = form.notes || null;
        if (canEditParties) {
          payload.patient_id = Number(form.patient_id);
          payload.doctor_id = Number(form.doctor_id);
        }
      }

      if (isEdit) {
        await authFetch(`/appointments/${appointment.id}`, { method: 'PUT', body: payload });
      } else {
        await authFetch('/appointments', { method: 'POST', body: payload });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // When parties are read-only (non-admin editing), show names instead of pickers.
  const partiesReadOnly = isEdit && !canEditParties;

  return (
    <Modal title={isEdit ? 'Edit appointment' : 'Book appointment'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        <label className="field">
          <span className="field__label">Patient *</span>
          {partiesReadOnly ? (
            <input value={appointment.patient_name} disabled />
          ) : (
            <select value={form.patient_id} onChange={set('patient_id')} required>
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>

        {showDoctorPicker && (
          <label className="field">
            <span className="field__label">Doctor *</span>
            {partiesReadOnly ? (
              <input value={appointment.doctor_name} disabled />
            ) : (
              <select value={form.doctor_id} onChange={set('doctor_id')} required>
                <option value="">Select a doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}

        <div className="form-row">
          <label className="field">
            <span className="field__label">Date &amp; time *</span>
            <input
              type="datetime-local"
              value={form.appointment_datetime}
              onChange={set('appointment_datetime')}
              required
            />
          </label>
          {showStatus && (
            <label className="field">
              <span className="field__label">Status</span>
              <select value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {showNotes && (
          <label className="field">
            <span className="field__label">Clinical notes</span>
            <textarea rows="3" value={form.notes} onChange={set('notes')} />
          </label>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Book appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
