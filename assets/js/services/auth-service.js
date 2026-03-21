import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { auth, db } from '../config/firebase-init.js';
import { setSession, clearSession } from '../state/session-store.js';

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const session = await resolveUserProfile(credential.user.uid, credential.user.email);
  setSession(session);
  return session;
}

export async function logoutUser() {
  await signOut(auth);
  clearSession();
}

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function resolveUserProfile(uid, email) {
  const adminRef = doc(db, 'platformAdmins', uid);
  const adminSnapshot = await getDoc(adminRef);

  if (adminSnapshot.exists()) {
    return {
      uid,
      email,
      role: 'admin',
      tenantId: null
    };
  }

  const tenantUsersRef = collection(db, 'tenantUsers');
  const tenantUsersQuery = query(
    tenantUsersRef,
    where('uid', '==', uid),
    limit(1)
  );

  const tenantUsersSnapshot = await getDocs(tenantUsersQuery);

  if (!tenantUsersSnapshot.empty) {
    const tenantUser = tenantUsersSnapshot.docs[0].data();

    return {
      uid,
      email,
      role: 'tenant',
      tenantId: tenantUser.tenantId
    };
  }

  throw new Error('Usuário autenticado, mas sem perfil configurado na plataforma.');
}