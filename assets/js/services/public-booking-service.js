import { getTenantBySlug } from './tenant-service.js';
import { listActiveServicesByTenant } from './service-service.js';
import { findCustomerByPhone, createCustomer, updateCustomer } from './customer-service.js';
import { createAppointment } from './appointment-service.js';

export async function getPublicTenantBySlug(slug) {
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return null;
  }

  if (tenant.publicPageEnabled === false) {
    return null;
  }

  if (tenant.isBlocked === true) {
    return null;
  }

  return tenant;
}

export async function listPublicServices(slug) {
  const tenant = await getPublicTenantBySlug(slug);

  if (!tenant) {
    return [];
  }

  return listActiveServicesByTenant(tenant.id);
}

export async function createPublicBooking({
  slug,
  customerName,
  customerPhone,
  customerEmail,
  serviceId,
  serviceName,
  date,
  time,
  durationMinutes,
  price
}) {
  const tenant = await getPublicTenantBySlug(slug);

  if (!tenant) {
    throw new Error('Empresa não encontrada ou página pública indisponível.');
  }

  const existingCustomer = await findCustomerByPhone(tenant.id, customerPhone);

  let customerId = null;

  if (existingCustomer) {
    customerId = existingCustomer.id;

    await updateCustomer(existingCustomer.id, {
      name: customerName,
      email: customerEmail || existingCustomer.email || '',
      lastAppointmentAt: `${date}T${time}:00`
    });
  } else {
    const createdCustomer = await createCustomer({
      tenantId: tenant.id,
      name: customerName,
      phone: customerPhone,
      email: customerEmail || '',
      lastAppointmentAt: `${date}T${time}:00`
    });

    customerId = createdCustomer.id;
  }

  const startAt = `${date}T${time}:00`;
  const startDate = new Date(startAt);
  const endDate = new Date(startDate.getTime() + Number(durationMinutes || 0) * 60000);
  const endAt = endDate.toISOString().slice(0, 19);

  return createAppointment({
    tenantId: tenant.id,
    customerId,
    customerName,
    serviceId,
    serviceName,
    startAt,
    endAt,
    price,
    status: 'scheduled',
    source: 'public_page'
  });
}