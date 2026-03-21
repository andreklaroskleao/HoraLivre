import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from '../config/firebase-init.js';

export async function getPlatformSettings() {
  const reference = doc(db, 'platformSettings', 'main');
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function savePlatformSettings(data) {
  const reference = doc(db, 'platformSettings', 'main');

  await setDoc(
    reference,
    {
      ...data,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function getAdminDashboardMetrics() {
  const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
  const billingSnapshot = await getDocs(collection(db, 'billingRecords'));

  let trialCount = 0;
  let activeCount = 0;
  let blockedCount = 0;
  let totalRevenue = 0;
  let totalCompleted = 0;

  tenantsSnapshot.forEach((documentItem) => {
    const tenant = documentItem.data();

    if (tenant.subscriptionStatus === 'trial') {
      trialCount += 1;
    }

    if (tenant.subscriptionStatus === 'active') {
      activeCount += 1;
    }

    if (tenant.subscriptionStatus === 'blocked' || tenant.isBlocked === true) {
      blockedCount += 1;
    }
  });

  billingSnapshot.forEach((documentItem) => {
    const billingRecord = documentItem.data();

    totalRevenue += Number(billingRecord.totalAmount || 0);
    totalCompleted += Number(billingRecord.completedAppointments || 0);
  });

  return {
    tenants: tenantsSnapshot.size,
    trial: trialCount,
    active: activeCount,
    blocked: blockedCount,
    completed: totalCompleted,
    revenue: totalRevenue
  };
}