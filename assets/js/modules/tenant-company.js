import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import { logoutUser } from '../services/auth-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getPlatformSettings } from '../services/admin-service.js';
import { listBillingRecordsByTenant } from '../services/billing-service.js';
import {
  formatBillingMode,
  formatCurrencyBRL,
  formatPhone,
  formatSubscriptionStatus,
  buildWhatsAppLink
} from '../utils/formatters.js';
import { setText } from '../utils/dom-utils.js';
import {
  renderTenantServicesList,
  submitCreateService
} from './tenant-services.js';
import {
  renderTenantCustomersList,
  submitCreateCustomer
} from './tenant-customers.js';
import {
  renderTenantAppointmentsList,
  submitCreateAppointment
} from './tenant-appointments.js';
import { loadTenantReportsIntoPage } from './tenant-reports.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();
const logoutButton = document.getElementById('logout-button');
const supportButton = document.getElementById('support-button');
const serviceForm = document.getElementById('service-form');
const customerForm = document.getElementById('customer-form');
const appointmentForm = document.getElementById('appointment-form');
const serviceFeedback = document.getElementById('service-feedback');
const customerFeedback = document.getElementById('customer-feedback');
const appointmentFeedback = document.getElementById('appointment-feedback');

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
}

async function loadDashboardSummary() {
  const billingRecords = await listBillingRecordsByTenant(tenantId);
  const latestRecord = billingRecords[0] || null;

  setText('tenant-stat-billing', formatCurrencyBRL(latestRecord?.totalAmount || 0));
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

serviceForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const success = await submitCreateService(serviceForm, serviceFeedback);

  if (success) {
    await renderTenantServicesList();
  }
});

customerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const success = await submitCreateCustomer(customerForm, customerFeedback);

  if (success) {
    await renderTenantCustomersList();
  }
});

appointmentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const success = await submitCreateAppointment(appointmentForm, appointmentFeedback);

  if (success) {
    await renderTenantAppointmentsList();
    await loadTenantReportsIntoPage();
  }
});

async function init() {
  try {
    await loadTenantData();
    await loadDashboardSummary();
    await loadSupportButton();
    await renderTenantServicesList();
    await renderTenantCustomersList();
    await renderTenantAppointmentsList();
    await loadTenantReportsIntoPage();
  } catch (error) {
    console.error(error);
  }
}

init();