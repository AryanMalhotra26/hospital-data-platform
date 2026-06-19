/**
 * UsersPage — admin-only placeholder. It's reachable only through the
 * <ProtectedRoute roles={['admin']}> guard, so a doctor/receptionist who types
 * /users in the URL is redirected home. (The backend enforces this for real.)
 */

export default function UsersPage() {
  return (
    <div>
      <h1 className="page__title">Users</h1>
      <div className="placeholder">
        Admin user management UI can be built out here. You can only see this page because your token's
        role is <strong>admin</strong>.
      </div>
    </div>
  );
}
