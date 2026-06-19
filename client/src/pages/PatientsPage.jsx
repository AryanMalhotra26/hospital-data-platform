/**
 * PatientsPage — lists patients and wires up create/edit/delete.
 *
 * What the user sees is role-shaped, but remember the backend is the real
 * gatekeeper:
 *   - "New patient": admin + receptionist.
 *   - Edit: admin + doctor (a doctor only ever receives their own patients).
 *   - Delete: admin only.
 * The list itself is already scoped server-side (a doctor's GET /patients only
 * returns their assigned patients).
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';
import PatientFormModal from '../components/PatientFormModal';

export default function PatientsPage() {
  const { user, authFetch } = useAuth();

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // patient object, 'new', or null

  const canCreate = user.role === 'admin' || user.role === 'receptionist';
  const canEdit = user.role === 'admin' || user.role === 'doctor';
  const canDelete = user.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Doctors list powers the assign dropdown; available to every role.
      const [patientsRes, doctorsRes] = await Promise.all([
        authFetch('/patients'),
        authFetch('/users/doctors'),
      ]);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(patient) {
    if (!window.confirm(`Delete ${patient.name}? This also removes their appointments and visits.`)) return;
    try {
      await authFetch(`/patients/${patient.id}`, { method: 'DELETE' });
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
          <h1 className="page__title">Patients</h1>
          <p className="page__subtitle" style={{ margin: 0 }}>
            {loading ? 'Loading…' : `${patients.length} ${user.role === 'doctor' ? 'assigned to you' : 'total'}`}
          </p>
        </div>
        {canCreate && (
          <button className="btn btn--primary" onClick={() => setEditing('new')}>
            + New patient
          </button>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!loading && patients.length === 0 ? (
        <div className="placeholder">No patients to show.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Assigned doctor</th>
                {(canEdit || canDelete) && <th className="table__actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatDate(p.dob)}</td>
                  <td className="cap">{p.gender || '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.doctor_name || <span className="muted">Unassigned</span>}</td>
                  {(canEdit || canDelete) && (
                    <td className="table__actions">
                      {canEdit && (
                        <button className="btn btn--ghost btn--sm" onClick={() => setEditing(p)}>
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn--danger btn--sm" onClick={() => handleDelete(p)}>
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PatientFormModal
          patient={editing === 'new' ? null : editing}
          doctors={doctors}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
