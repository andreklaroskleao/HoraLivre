import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { db } from '../config/firebase-init.js';

export async function listAppointmentsByTenant(tenantId) {
  const appointmentsQuery = query(
    collection(db, 'appointments'),
    where('tenantId', '==', tenantId),
    orderBy('startAt', 'asc')
  );

  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function listAppointmentsByTenantAndPeriod(tenantId, startIso, endIso) {
  const appointmentsQuery = query(
    collection(db, 'appointments'),
    where('tenantId', '==', tenantId),
    where('startAt', '>=', startIso),
    where('startAt', '<=', endIso),
    orderBy('startAt', 'asc')
  );

  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function createAppointment(data) {
  const payload = {
    tenantId: data.tenantId,
    customerId: data.customerId || null,
    customerName: data.customerName || '',
    serviceId: data.serviceId || null,
    serviceName: data.serviceName || '',
    startAt: data.startAt,
    endAt: data.endAt,
    price: Number(data.price || 0),
    status: data.status || 'scheduled',
    source: data.source || 'panel',
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return addDoc(collection(db, 'appointments'), payload);
}

export async function updateAppointment(appointmentId, data) {
  const ref = doc(db, 'appointments', appointmentId);

  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString()
  });
}

export async function updateAppointmentStatus(appointmentId, status) {
  const ref = doc(db, 'appointments', appointmentId);

  await updateDoc(ref, {
    status,
    updatedAt: new Date().toISOString()
  });
}

export async function countCompletedAppointments(tenantId, startIso, endIso) {
  const appointments = await listAppointmentsByTenantAndPeriod(tenantId, startIso, endIso);

  return appointments.filter((item) => item.status === 'completed').length;
}