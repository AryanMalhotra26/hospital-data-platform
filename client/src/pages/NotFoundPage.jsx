/**
 * NotFoundPage — catch-all 404 for unknown routes.
 */

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="login">
      <div className="login__card" style={{ textAlign: 'center' }}>
        <h1 className="login__title">404</h1>
        <p className="login__subtitle">That page doesn't exist.</p>
        <Link className="btn btn--primary" to="/">
          Go home
        </Link>
      </div>
    </div>
  );
}
