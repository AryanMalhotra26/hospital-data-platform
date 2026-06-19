/**
 * DashboardPage — the post-login landing page (route "/").
 *
 * For now it's a role-aware welcome with quick links. In Step 6 this becomes
 * the analytics dashboard (Recharts). It demonstrates reading the current user
 * from context and adapting the UI to their role.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_BLURB = {
  admin: 'You have full access: manage users, patients, appointments, and view all analytics.',
  doctor: 'You can view and manage your own assigned patients and appointments.',
  receptionist: 'You can register patients and book appointments.',
};

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="page__title">Welcome, {user.name.split(' ')[0]} 👋</h1>
      <p className="page__subtitle">
        You are signed in as <span className={`badge badge--${user.role}`}>{user.role}</span>.{' '}
        {ROLE_BLURB[user.role]}
      </p>

      <div className="cards">
        <Link to="/patients" className="card">
          <div className="card__icon">🧑‍⚕️</div>
          <div className="card__title">Patients</div>
          <div className="card__text">
            {user.role === 'doctor' ? 'View & update your assigned patients.' : 'Register and manage patients.'}
          </div>
        </Link>

        <Link to="/appointments" className="card">
          <div className="card__icon">📅</div>
          <div className="card__title">Appointments</div>
          <div className="card__text">Book, reschedule, and track appointment status.</div>
        </Link>

        {user.role === 'admin' && (
          <Link to="/users" className="card">
            <div className="card__icon">👤</div>
            <div className="card__title">Users</div>
            <div className="card__text">Manage staff accounts and roles.</div>
          </Link>
        )}
      </div>
    </div>
  );
}
