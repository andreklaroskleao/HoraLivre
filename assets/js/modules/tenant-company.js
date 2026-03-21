import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import { logoutUser } from '../services/auth-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { listServicesByTenant } from '../services/service-service.js';
import { listCustomersByTenant } from '../services/customer-service.js';
import { listAppointmentsByTenant } from '../services/appointment-service.js';
import { getPlatformSettings } from '../services/admin-service.js';
import { listBillingRecordsByTenant } from '../services/billing-service.js';
import {
  formatBillingMode,
  formatCurrencyBRL,
  formatPhone,
  formatSubscriptionStatus,
  formatAppointmentStatus,
  buildWhatsAppLink
} from '../utils/formatters.js';
import { setText, clearElement, createListItem } from '../utils/dom-utils.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();
const logoutButton = document.getElementById('logout-button');
const servicesList = document.getElementById('services-list');
const customersList = document.getElementById('customers-list');
const appointmentsList = document.getElementById('appointments-list');
const supportButton = document.getElementById('support-button');

logoutButton?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'login.html';
});

async function loadTenantData() {
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    throw new Error('Tenant não encontrado.');
  }

  setText('tenant-business-name', tenant.businessName || '-');
  setText('company-name', tenant.businessName || '-');
  setText('company-slug', tenant.slug || '-');
  setText('company-whatsapp', formatPhone(tenant.whatsapp || '-'));
  setText('company-description', tenant.description || '-');
  setText('company-logo-url', tenant.logoUrl || '-');
  setText('company-plan', tenant.planId || '-');
  setText('company-billing-mode', formatBillingMode(tenant.billingMode));
  setText('company-status', formatSubscriptionStatus(tenant.subscriptionStatus));

  return tenant;
}

async function loadServices() {
  const services = await listServicesByTenant(tenantId);

  clearElement(servicesList);

  services.forEach((service) => {
    servicesList.appendChild(createListItem(`
      <strong>${service.name}</strong><br>
      Duração: ${service.durationMinutes || 0} min<br>
      Valor: ${formatCurrencyBRL(service.price || 0)}<br>
      Ativo: ${service.isActive ? 'Sim' : 'Não'}
    `));
  });
}

async function loadCustomers() {
  const customers = await listCustomersByTenant(tenantId);

  clearElement(customersList);

  customers.forEach((customer) => {
    customersList.appendChild(createListItem(`
      <strong>${customer.name}</strong><br>
      Telefone: ${formatPhone(customer.phone || '')}<br>
      Total de atendimentos: ${customer.totalAppointments || 0}<br>
      Total gasto: ${formatCurrencyBRL(customer.totalSpent || 0)}
    `));
  });

  setText('tenant-stat-customers', customers.length);
}

async function loadAppointments() {
  const appointments = await listAppointmentsByTenant(tenantId);

  clearElement(appointmentsList);

  let todayCount = 0;
  let completedCount = 0;

  const todayDate = new Date().toISOString().slice(0, 10);

  appointments.forEach((appointment) => {
    if (String(appointment.startAt || '').startsWith(todayDate)) {
      todayCount += 1;
    }

    if (appointment.status === 'completed') {
      completedCount += 1;
    }

    appointmentsList.appendChild(createListItem(`
      <strong>${appointment.customerName || '-'}</strong><br>
      Serviço: ${appointment.serviceName || '-'}<br>
      Início: ${appointment.startAt || '-'}<br>
      Valor: ${formatCurrencyBRL(appointment.price || 0)}<br>
      Status: ${formatAppointmentStatus(appointment.status)}
    `));
  });

  setText('tenant-stat-today', todayCount);
  setText('tenant-stat-completed', completedCount);
  setText('report-completed', completedCount);
}

async function loadBilling() {
  const billingRecords = await listBillingRecordsByTenant(tenantId);
  const latestRecord = billingRecords[0] || null;

  setText('tenant-stat-billing', formatCurrencyBRL(latestRecord?.totalAmount || 0));
  setText('report-total', formatCurrencyBRL(latestRecord?.totalAmount || 0));
  setText('report-status', latestRecord?.status || '-');
}

async function loadSupportButton() {
  const settings = await getPlatformSettings();

  if (!settings?.supportWhatsapp) {
    return;
  }

  supportButton.href = buildWhatsAppLink(
    settings.supportWhatsapp,
    settings.supportWhatsappMessage || 'Olá, preciso de ajuda com o HoraLivre.'
  );
}

async function init() {
  try {
    await loadTenantData();
    await Promise.all([
      loadServices(),
      loadCustomers(),
      loadAppointments(),
      loadBilling(),
      loadSupportButton()
    ]);
  } catch (error) {
    console.error(error);
  }
}

init();