import { requireAdmin } from '../utils/guards.js';
import { logoutUser } from '../services/auth-service.js';
import {
  getAdminDashboardMetrics,
  getPlatformSettings
} from '../services/admin-service.js';
import { listTenants } from '../services/tenant-service.js';
import { listPlans } from '../services/plan-service.js';
import { listBillingRecords } from '../services/billing-service.js';
import {
  formatBillingMode,
  formatCurrencyBRL,
  formatSubscriptionStatus
} from '../utils/formatters.js';
import {
  setText,
  clearElement,
  createListItem
} from '../utils/dom-utils.js';

if (!requireAdmin()) {
  throw new Error('Acesso negado.');
}

const logoutButton = document.getElementById('logout-button');
const tenantsTableBody = document.getElementById('tenants-table-body');
const plansList = document.getElementById('plans-list');
const billingList = document.getElementById('billing-list');

logoutButton?.addEventListener('click', async () => {
  await logoutUser();
  window.location.href = './login.html';
});

async function loadMetrics() {
  const metrics = await getAdminDashboardMetrics();

  setText('stat-tenants', String(metrics.tenants));
  setText('stat-trial', String(metrics.trial));
  setText('stat-active', String(metrics.active));
  setText('stat-blocked', String(metrics.blocked));
  setText('stat-completed', String(metrics.completed));
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

  if (tenants.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6">Nenhum cliente da plataforma cadastrado ainda.</td>
    `;
    tenantsTableBody.appendChild(row);
    return;
  }

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

  if (plans.length === 0) {
    plansList.appendChild(createListItem(`
      <strong>Nenhum plano cadastrado</strong><br>
      Crie os planos do HoraLivre para começar a vincular aos seus clientes.
    `));
    return;
  }

  plans.forEach((plan) => {
    plansList.appendChild(createListItem(`
      <strong>${plan.name}</strong><br>
      Cobrança: ${formatBillingMode(plan.billingMode)}<br>
      Preço fixo: ${formatCurrencyBRL(plan.price || 0)}<br>
      Por serviço: ${formatCurrencyBRL(plan.pricePerExecutedService || 0)}<br>
      Página pública: ${plan.publicPageEnabled ? 'Sim' : 'Não'}<br>
      Relatórios: ${plan.reportsEnabled ? 'Sim' : 'Não'}
    `));
  });
}

async function loadBilling() {
  const records = await listBillingRecords();

  clearElement(billingList);

  if (records.length === 0) {
    billingList.appendChild(createListItem(`
      <strong>Nenhum registro de cobrança encontrado</strong><br>
      Os registros mensais de cobrança aparecerão aqui.
    `));
    return;
  }

  records.forEach((record) => {
    billingList.appendChild(createListItem(`
      <strong>${record.monthRef}</strong><br>
      Tenant: ${record.tenantId}<br>
      Modo: ${formatBillingMode(record.billingMode)}<br>
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
    console.error('Erro ao carregar o painel admin do HoraLivre:', error);
  }
}

init();