/**
 * LoginPage — email/password form that calls the auth context's login().
 *
 * Flow:
 *   - If already logged in, never show the form; redirect home.
 *   - On submit, call login(); on success go back to wherever the guard sent
 *     them from (location.state.from), defaulting to "/".
 *   - On failure, show the server's message (e.g. "Invalid email or password").
 */

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Where to go after login: the page the guard bounced us from, or home.
  const from = location.state?.from?.pathname || '/';

  // Already authenticated? Skip the form.
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">🏥 Hospital Platform</h1>
        <p className="login__subtitle">Sign in to continue</p>

        {error && <div className="alert alert--error">{error}</div>}

        <label className="field">
          <span className="field__label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="login__hint">
          <strong>Demo accounts</strong> (password <code>Password123!</code>):
          <ul>
            <li>admin@hospital.test — admin</li>
            <li>dr.chen@hospital.test — doctor</li>
            <li>reception@hospital.test — receptionist</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
