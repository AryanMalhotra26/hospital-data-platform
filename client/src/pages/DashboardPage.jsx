/**
 * DashboardPage — the post-login landing page (route "/").
 *
 * Admins and doctors get the analytics dashboard (doctors see it scoped to
 * their own data). Receptionists, who don't have analytics access, get
 * role-aware quick links instead.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const ROLE_BLURB = {
  admin: 'You have full access: manage users, patients, appointments, and view all analytics.',
  doctor: 'Here are the analytics for your assigned patients and appointments.',
  receptionist: 'You can register patients and book appointments.',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const showAnalytics = user.role === 'admin' || user.role === 'doctor';

  return (
    <div>
      <h1 className="page__title">Welcome, {user.name.split(' ')[0]} 👋</h1>
      <p className="page__subtitle">
        You are signed in as <span className={`badge badge--${user.role}`}>{user.role}</span>.{' '}
        {ROLE_BLURB[user.role]}
      </p>

      {showAnalytics ? (
        <AnalyticsDashboard />
      ) : (
        <div className="cards">
          <Link to="/patients" className="card">
            <div className="card__icon">🧑‍⚕️</div>
            <div className="card__title">Patients</div>
            <div className="card__text">Register and manage patients.</div>
          </Link>
          <Link to="/appointments" className="card">
            <div className="card__icon">📅</div>
            <div className="card__title">Appointments</div>
            <div className="card__text">Book, reschedule, and track appointment status.</div>
          </Link>
        </div>
      )}
    </div>
  );
}
