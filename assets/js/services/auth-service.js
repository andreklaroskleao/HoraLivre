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

  console.log('HoraLivre login autenticado com sucesso.');
  console.log('UID autenticado:', credential.user.uid);
  console.log('E-mail autenticado:', credential.user.email);
  console.log('Projeto Firebase em uso:', auth.app.options.projectId);

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
  const adminReference = doc(db, 'platformAdmins', uid);

  console.log('Tentando localizar admin em:', `platformAdmins/${uid}`);

  const adminSnapshot = await getDoc(adminReference);

  console.log('Admin encontrado?', adminSnapshot.exists());

  if (adminSnapshot.exists()) {
    console.log('Documento admin:', adminSnapshot.data());

    return {
      uid,
      email,
      role: 'admin',
      tenantId: null
    };
  }

  const tenantUsersReference = collection(db, 'tenantUsers');
  const tenantUsersQuery = query(
    tenantUsersReference,
    where('uid', '==', uid),
    limit(1)
  );

  const tenantUsersSnapshot = await getDocs(tenantUsersQuery);

  console.log('Tenant user encontrado?', !tenantUsersSnapshot.empty);

  if (!tenantUsersSnapshot.empty) {
    const tenantUser = tenantUsersSnapshot.docs[0].data();

    console.log('Documento tenant user:', tenantUser);

    return {
      uid,
      email,
      role: 'tenant',
      tenantId: tenantUser.tenantId
    };
  }

  throw new Error('Usuário autenticado, mas sem perfil configurado na plataforma.');
}