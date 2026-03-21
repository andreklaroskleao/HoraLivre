import { setSession, clearSession } from '../state/session-store.js';

export async function loginWithEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const adminEmails = ['admin@horalivre.com', 'ia.klar.leao@gmail.com'];

  if (adminEmails.includes(normalized)) {
    const session = {
      uid: 'admin-1',
      email: normalized,
      role: 'admin',
      tenantId: null
    };

    setSession(session);
    return session;
  }

  const session = {
    uid: 'user-tenant',
    email: normalized || 'cliente@demo.com',
    role: 'tenant',
    tenantId: 'tenant-1'
  };

  setSession(session);
  return session;
}

export async function logoutUser() {
  clearSession();
}