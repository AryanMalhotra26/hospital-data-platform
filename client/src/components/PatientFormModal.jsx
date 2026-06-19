/**
 * PatientFormModal — create or edit a patient.
 *
 * Role-aware field rule (mirrors the backend):
 *   - assigned doctor is editable when CREATING as admin/receptionist, or when
 *     EDITING as admin. A doctor editing their own patient sees it read-only
 *     (only an admin can reassign), so we don't even send the field for them —
 *     which keeps the backend from returning a 403.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

export default function PatientFormModal({ patient, doctors, onClose, onSaved }) {
  const { user, authFetch } = useAuth();
  const isEdit = Boolean(patient);

  const [form, setForm] = useState({
    name: patient?.name || '',
    dob: patient?.dob || '',
    gender: patient?.gender || '',
    phone: patient?.phone || '',
    assigned_doctor_id: patient?.assigned_doctor_id ? String(patient.assigned_doctor_id) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Can the current user choose the assigned doctor in this context?
  const canAssign = isEdit ? user.role === 'admin' : user.role === 'admin' || user.role === 'receptionist';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Build the payload, omitting empty optionals and the doctor field when
      // the user isn't allowed to set it.
      const payload = {
        name: form.name,
        dob: form.dob || null,
        gender: form.gender || null,
        phone: form.phone || null,
      };
      if (canAssign) {
        payload.assigned_doctor_id = form.assigned_doctor_id ? Number(form.assigned_doctor_id) : null;
      }

      if (isEdit) {
        await authFetch(`/patients/${patient.id}`, { method: 'PUT', body: payload });
      } else {
        await authFetch('/patients', { method: 'POST', body: payload });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit patient' : 'New patient'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        <label className="field">
          <span className="field__label">Name *</span>
          <input value={form.name} onChange={set('name')} required autoFocus />
        </label>

        <div className="form-row">
          <label className="field">
            <span className="field__label">Date of birth</span>
            <input type="date" value={form.dob} onChange={set('dob')} />
          </label>
          <label className="field">
            <span className="field__label">Gender</span>
            <select value={form.gender} onChange={set('gender')}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field__label">Phone</span>
          <input value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" />
        </label>

        <label className="field">
          <span className="field__label">Assigned doctor</span>
          {canAssign ? (
            <select value={form.assigned_doctor_id} onChange={set('assigned_doctor_id')}>
              <option value="">Unassigned</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            // Read-only for a doctor editing their own patient.
            <input value={patient?.doctor_name || 'You'} disabled />
          )}
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create patient'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
