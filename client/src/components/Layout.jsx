/**
 * Layout — the shell shown on every authenticated page: a top nav bar plus an
 * <Outlet /> where the active page renders.
 *
 * The nav is ROLE-AWARE: e.g. only admins see the "Users" link. This is purely
 * cosmetic (don't show buttons people can't use); the backend still enforces
 * who can actually do what.
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar__brand">🏥 Hospital Platform</div>

        <nav className="navbar__links">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
          <NavLink to="/appointments">Appointments</NavLink>
          {user?.role === 'admin' && <NavLink to="/users">Users</NavLink>}
        </nav>

        <div className="navbar__user">
          <span className="navbar__name">{user?.name}</span>
          <span className={`badge badge--${user?.role}`}>{user?.role}</span>
          <button className="btn btn--ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
