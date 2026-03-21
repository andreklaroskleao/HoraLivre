import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from '../config/firebase-init.js';

export async function getPlatformSettings() {
  const ref = doc(db, 'platformSettings', 'main');
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function updatePlatformSettings(data) {
  const ref = doc(db, 'platformSettings', 'main');
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

export async function getAdminDashboardMetrics() {
  const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
  const billingSnapshot = await getDocs(collection(db, 'billingRecords'));

  let trialCount = 0;
  let activeCount = 0;
  let blockedCount = 0;
  let totalRevenue = 0;
  let totalCompleted = 0;

  tenantsSnapshot.forEach((docItem) => {
    const item = docItem.data();

    if (item.subscriptionStatus === 'trial') {
      trialCount += 1;
    }

    if (item.subscriptionStatus === 'active') {
      activeCount += 1;
    }

    if (item.isBlocked === true || item.subscriptionStatus === 'blocked') {
      blockedCount += 1;
    }
  });

  billingSnapshot.forEach((docItem) => {
    const item = docItem.data();
    totalRevenue += Number(item.totalAmount || 0);
    totalCompleted += Number(item.completedAppointments || 0);
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