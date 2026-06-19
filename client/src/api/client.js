/**
 * Tiny fetch wrapper around the REST API.
 *
 * Responsibilities:
 *   - prefix every path with the API base URL
 *   - JSON-encode the body and set the right headers
 *   - attach the Bearer token when one is provided
 *   - turn any non-2xx response into a thrown Error that carries `.status` and
 *     the server's `.data`, so callers can `try/catch` and show `err.message`
 *
 * The token is passed IN (not read from storage) because it lives in React
 * state (AuthContext), never in localStorage — see AuthContext for the why.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (e.g. DELETE) has an empty body.
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export { API_URL };
