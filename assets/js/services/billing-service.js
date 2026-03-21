import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from '../config/firebase-init.js';

export async function getBillingSettingsByTenant(tenantId) {
  const settingsQuery = query(
    collection(db, 'billingSettings'),
    where('tenantId', '==', tenantId),
    limit(1)
  );

  const snapshot = await getDocs(settingsQuery);

  if (snapshot.empty) {
    return null;
  }

  const docItem = snapshot.docs[0];

  return {
    id: docItem.id,
    ...docItem.data()
  };
}

export async function saveBillingSettings(recordId, data) {
  const ref = doc(db, 'billingSettings', recordId);

  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

export async function listBillingRecords() {
  const billingQuery = query(collection(db, 'billingRecords'), orderBy('monthRef', 'desc'));
  const snapshot = await getDocs(billingQuery);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function listBillingRecordsByTenant(tenantId) {
  const billingQuery = query(
    collection(db, 'billingRecords'),
    where('tenantId', '==', tenantId),
    orderBy('monthRef', 'desc')
  );

  const snapshot = await getDocs(billingQuery);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function generateBillingRecord(data) {
  const payload = {
    tenantId: data.tenantId,
    monthRef: data.monthRef,
    billingMode: data.billingMode,
    completedAppointments: Number(data.completedAppointments || 0),
    unitPrice: Number(data.unitPrice || 0),
    fixedAmount: Number(data.fixedAmount || 0),
    totalAmount: Number(data.totalAmount || 0),
    status: data.status || 'pending',
    generatedAt: new Date().toISOString(),
    paidAt: data.paidAt || null,
    notes: data.notes || ''
  };

  return addDoc(collection(db, 'billingRecords'), payload);
}

export async function markBillingRecordAsPaid(recordId) {
  const ref = doc(db, 'billingRecords', recordId);

  await updateDoc(ref, {
    status: 'paid',
    paidAt: new Date().toISOString()
  });
}

export function calculateBillingForPeriod({
  billingMode,
  completedAppointments,
  fixedMonthlyPrice,
  pricePerExecutedService
}) {
  if (billingMode === 'fixed_plan') {
    return Number(fixedMonthlyPrice || 0);
  }

  if (billingMode === 'per_service') {
    return Number(completedAppointments || 0) * Number(pricePerExecutedService || 0);
  }

  return 0;
}