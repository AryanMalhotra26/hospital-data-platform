/**
 * JWT helpers — the ONLY place tokens are signed or verified.
 *
 * Token contents (the "claims"):
 *   sub  -> the user's id   (standard "subject" claim)
 *   role -> 'admin' | 'doctor' | 'receptionist'  (drives backend RBAC)
 *   name -> display name    (handy for the UI greeting; not sensitive)
 *
 * We deliberately keep the payload SMALL and non-sensitive. A JWT is signed,
 * not encrypted — anyone holding it can read (base64-decode) the claims. Never
 * put a password hash or anything secret in here.
 */

'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Create a signed access token for a freshly authenticated user.
 * @param {{id:number, role:string, name:string}} user
 * @returns {string} signed JWT
 */
function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify a token's signature and expiry.
 * @param {string} token
 * @returns {object} the decoded payload
 * @throws if the token is invalid or expired (caller maps this to 401)
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signAccessToken, verifyAccessToken };
