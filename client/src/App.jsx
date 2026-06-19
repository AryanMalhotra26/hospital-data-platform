/**
 * App — the route table.
 *
 * Structure (nested routes):
 *   /login                      public
 *   <ProtectedRoute>            requires a token, else -> /login
 *     <Layout>                  nav bar + <Outlet/>
 *       /            Dashboard
 *       /patients    Patients
 *       /appointments Appointments
 *       <ProtectedRoute roles={['admin']}>   extra role gate
 *         /users     Users (admin only)
 *   *                           404
 *
 * Wrapping a group of routes in a <ProtectedRoute> element means the guard runs
 * once for the whole group — clean and DRY.
 */

import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import UsersPage from './pages/UsersPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Everything below requires authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />

          {/* Admin-only subtree */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
