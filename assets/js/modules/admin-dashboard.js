import { requireAdmin } from '../utils/guards.js';
import { logoutUser } from '../services/auth-service.js';
import { getAdminDashboardMetrics, getPlatformSettings } from '../services/admin-service.js';
import { listTenants } from '../services/tenant-service.js';
import { listPlans } from '../services/plan-service.js';
import { listBillingRecords } from '../services/billing-service.js';
import {
  formatBillingMode,
  formatCurrencyBRL,
  formatSubscriptionStatus
} from '../utils/formatters.js';
import { setText, clearElement, createListItem } from '../utils/dom-utils.js';

if (!requireAdmin()) {
  throw new Error('Acesso negado.');
}

const logoutButton = document.getElementById('logout-button');
const tenantsTableBody = document.getElementById('tenants-table-body');
const plansList = document.getElementById('plans-list');
const billingList = document.getElementById('billing-list');

logoutButton?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = 'login.html';
});

async function loadMetrics() {
  const metrics = await getAdminDashboardMetrics();

  setText('stat-tenants', metrics.tenants);
  setText('stat-trial', metrics.trial);
  setText('stat-active', metrics.active);
  setText('stat-blocked', metrics.blocked);
  setText('stat-completed', metrics.completed);
  setText('stat-revenue', formatCurrencyBRL(metrics.revenue));
}

async function loadSettings() {
  const settings = await getPlatformSettings();

  setText('support-whatsapp', settings?.supportWhatsapp || '-');
  setText('support-message', settings?.supportWhatsappMessage || '-');
}

async function loadTenantsTable() {
  const tenants = await listTenants();

  clearElement(tenantsTableBody);

  tenants.forEach((tenant) => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${tenant.businessName || '-'}</td>
      <td>${tenant.planId || '-'}</td>
      <td>${formatBillingMode(tenant.billingMode)}</td>
      <td>${formatSubscriptionStatus(tenant.subscriptionStatus)}</td>
      <td>${tenant.completedAppointmentsCurrentPeriod || 0}</td>
      <td>${formatCurrencyBRL(tenant.amountDueCurrentPeriod || 0)}</td>
    `;

    tenantsTableBody.appendChild(row);
  });
}

async function loadPlans() {
  const plans = await listPlans();

  clearElement(plansList);

  plans.forEach((plan) => {
    plansList.appendChild(createListItem(`
      <strong>${plan.name}</strong><br>
      Cobrança: ${formatBillingMode(plan.billingMode)}<br>
      Preço fixo: ${formatCurrencyBRL(plan.price)}<br>
      Por serviço: ${formatCurrencyBRL(plan.pricePerExecutedService)}
    `));
  });
}

async function loadBilling() {
  const records = await listBillingRecords();

  clearElement(billingList);

  records.forEach((record) => {
    billingList.appendChild(createListItem(`
      <strong>${record.monthRef}</strong><br>
      Tenant: ${record.tenantId}<br>
      Concluídos: ${record.completedAppointments || 0}<br>
      Total: ${formatCurrencyBRL(record.totalAmount || 0)}<br>
      Status: ${record.status || '-'}
    `));
  });
}

async function init() {
  try {
    await Promise.all([
      loadMetrics(),
      loadSettings(),
      loadTenantsTable(),
      loadPlans(),
      loadBilling()
    ]);
  } catch (error) {
    console.error(error);
  }
}

init();