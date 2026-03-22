import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from '../config/firebase-init.js';

export async function listTenantUsersByTenant(tenantId) {
  const tenantUsersQuery = query(
    collection(db, 'tenantUsers'),
    where('tenantId', '==', tenantId)
  );

  const snapshot = await getDocs(tenantUsersQuery);

  return snapshot.docs.map((documentItem) => ({
    id: documentItem.id,
    ...documentItem.data()
  }));
}

export async function findTenantUserByUid(uid) {
  const tenantUsersQuery = query(
    collection(db, 'tenantUsers'),
    where('uid', '==', uid),
    limit(1)
  );

  const snapshot = await getDocs(tenantUsersQuery);

  if (snapshot.empty) {
    return null;
  }

  const documentItem = snapshot.docs[0];

  return {
    id: documentItem.id,
    ...documentItem.data()
  };
}

export async function createTenantUser(data) {
  const payload = {
    tenantId: data.tenantId,
    uid: data.uid,
    name: data.name,
    email: data.email,
    role: data.role || 'owner',
    createdAt: new Date().toISOString()
  };

  return addDoc(collection(db, 'tenantUsers'), payload);
}