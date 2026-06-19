/**
 * AuthContext — the single source of truth for "who is logged in".
 *
 * SECURITY DECISION: the JWT lives in React state (memory), NOT localStorage.
 *
 *   Tradeoff:
 *   + Tokens in localStorage are readable by ANY JavaScript on the page, so a
 *     single XSS bug lets an attacker steal a long-lived token and impersonate
 *     the user from anywhere. An in-memory token can't be read that way and is
 *     wiped the moment the tab closes.
 *   - The cost is convenience: a full page refresh loses the token, so the user
 *     has to log in again. (This is expected behavior, not a bug.)
 *
 *   The production-grade middle ground is a short-lived access token in memory
 *   plus a refresh token in an httpOnly, SameSite cookie (unreadable by JS) to
 *   silently re-issue access tokens. That's beyond this project's scope, but
 *   it's the natural next step and worth mentioning.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // token + user are held only in memory for the life of the tab.
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  /** Exchange credentials for a token; throws on failure (caller shows the error). */
  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  /** Clear the session. */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  /**
   * authFetch — make an authenticated API call with the current token attached.
   * If the server says 401 (expired/invalid token), we log out so the UI falls
   * back to the login screen instead of showing a broken page.
   */
  const authFetch = useCallback(
    async (path, options = {}) => {
      try {
        return await apiFetch(path, { ...options, token });
      } catch (err) {
        if (err.status === 401) logout();
        throw err;
      }
    },
    [token, logout]
  );

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook so components do `const { user } = useAuth()`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
