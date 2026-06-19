/**
 * Authentication + authorization middleware — the backbone of RBAC.
 *
 * This is the "never trust the frontend" layer. Even if the React app hides a
 * button, these checks run on the server for EVERY protected request, so a
 * hand-crafted curl/Postman call can't bypass them.
 *
 * Two distinct concerns, kept separate:
 *   - authenticate: WHO are you? (verify the JWT, attach req.user)
 *   - requireRole:  are you ALLOWED here? (check the role claim)
 *
 * Row-level ownership ("is this YOUR patient?") is finer-grained than a role
 * check and depends on data, so it lives in the controllers/queries, not here.
 */

'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Verify the Bearer token and attach req.user = { id, role, name }.
 * Rejects with 401 if the token is missing, malformed, invalid, or expired.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    // Re-shape the claims into the req.user the rest of the app expects.
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch (err) {
    // jwt throws TokenExpiredError / JsonWebTokenError — both become a 401.
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Allow only the listed roles past this point.
 * Usage:  router.post('/', requireRole('admin', 'receptionist'), handler)
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
