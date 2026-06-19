/**
 * ProtectedRoute — the frontend route guard.
 *
 * IMPORTANT: this is a UX convenience, NOT security. It stops unauthenticated
 * users from *seeing* a page and redirects them to /login, but the real
 * enforcement is the backend middleware (a determined user can edit JS state).
 * Never rely on this guard to protect data.
 *
 * Usage as a layout/wrapper route:
 *   <Route element={<ProtectedRoute />}> ...authed routes... </Route>
 *   <Route element={<ProtectedRoute roles={['admin']} />}> ...admin routes... </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Not logged in -> send to login, remembering where they wanted to go so we
  // can bounce them back after a successful login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but lacking the required role -> send home (the nav also hides
  // links they can't use, but this covers someone typing the URL directly).
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Authorized: render the nested routes.
  return <Outlet />;
}
