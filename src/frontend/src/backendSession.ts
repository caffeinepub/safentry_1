/**
 * backendSession.ts
 * Backend-backed session security layer.
 * All calls are wrapped in try/catch — if the backend is unavailable,
 * the app continues to work with localStorage sessions (offline support).
 */

import type { backendInterface } from "./backend";

const SESSION_TOKEN_KEY = "safentry_session_token";

let _actor:
  | (backendInterface & Record<string, (...args: any[]) => any>)
  | null = null;

/** Called from App.tsx whenever the actor becomes available */
export function setSessionActor(actor: backendInterface | null): void {
  _actor = actor as
    | (backendInterface & Record<string, (...args: any[]) => any>)
    | null;
}

/** Create a backend session after successful login. Stores token in localStorage. */
export async function createBackendSession(
  companyId: string,
  staffId: string,
  role: string,
): Promise<void> {
  if (!_actor) return;
  try {
    const token = await _actor.createSession(companyId, staffId, role);
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token as string);
    }
  } catch {
    // Backend unavailable — proceed with localStorage session only
  }
}

/** Validate existing session token on app mount. Returns false if invalid. */
export async function validateBackendSession(): Promise<boolean> {
  if (!_actor) return true; // Can't validate, assume valid (offline mode)
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return true; // No token yet (old session before feature rollout)
  try {
    const result = await _actor.validateSession(token);
    if (result === null || result === undefined) {
      // Session expired or invalid on backend
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return false;
    }
    return true;
  } catch {
    // Backend unavailable — fall back silently
    return true;
  }
}

/** Refresh session timer. Returns false if session has expired. */
export async function refreshBackendSession(): Promise<boolean> {
  if (!_actor) return true;
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return true;
  try {
    const result = await _actor.refreshSession(token);
    return result !== false;
  } catch {
    return true;
  }
}

/** Fire-and-forget session deletion on logout. */
export function deleteBackendSession(): void {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  if (!_actor || !token) return;
  // Fire and forget — do not await, do not block logout
  try {
    _actor.deleteSession(token).catch(() => {});
  } catch {
    // ignore
  }
}
