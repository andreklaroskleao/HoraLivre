import { requireAdmin } from '../utils/guards.js';
import { listTenants } from '../services/tenant-service.js';
import {
  getBillingSettingsByTenant,
  calculateBillingForPeriod,
  createOrReplaceBillingRecord,
  listBillingRecords,
  markBillingRecordAsPaid
} from '../services/billing-service.js';
import { countCompletedAppointments } from '../services/appointment-service.js';
import { formatCurrencyBRL, formatBillingMode } from '../utils/formatters.js';
import { getMonthReference, getStartAndEndOfCurrentMonth } from '../utils/date-utils.js';
import { clearElement, createListItem } from '../utils/dom-utils.js';

if (!requireAdmin()) {
  throw new Error('Acesso negado.');
}

export async function generateCurrentMonthBillingForAllTenants() {
  const tenants = await listTenants();
  const { startIso, endIso } = getStartAndEndOfCurrentMonth();
  const monthReference = getMonthReference();

  for (const tenant of tenants) {
    if (tenant.subscriptionStatus === 'blocked' || tenant.isBlocked === true) {
      continue;
    }

    const billingSettings = await getBillingSettingsByTenant(tenant.id);
    const completedAppointments = await countCompletedAppointments(tenant.id, startIso, endIso);

    const totalAmount = calculateBillingForPeriod({
      billingMode: tenant.billingMode,
      completedAppointments,
      fixedMonthlyPrice: billingSettings?.fixedMonthlyPrice || 0,
      pricePerExecutedService: billingSettings?.pricePerExecutedService || 0
    });

    await createOrReplaceBillingRecord(`billing_${monthReference}_${tenant.id}`, {
      tenantId: tenant.id,
      monthRef: monthReference,
      billingMode: tenant.billingMode,
      completedAppointments,
      unitPrice: billingSettings?.pricePerExecutedService || 0,
      fixedAmount: billingSettings?.fixedMonthlyPrice || 0,
      totalAmount,
      status: 'pending',
      notes: ''
    });
  }
}

export async function renderAdminBillingList(elementId = 'billing-list') {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  const records = await listBillingRecords();

  clearElement(element);

  if (records.length === 0) {
    element.appendChild(createListItem(`
      <strong>Nenhum registro de cobrança encontrado</strong><br>
      Gere a cobrança mensal para exibir os registros aqui.
    `));
    return;
  }

  records.forEach((record) => {
    element.appendChild(createListItem(`
      <strong>${record.monthRef}</strong><br>
      Tenant: ${record.tenantId}<br>
      Modo: ${formatBillingMode(record.billingMode)}<br>
      Concluídos: ${record.completedAppointments || 0}<br>
      Total: ${formatCurrencyBRL(record.totalAmount || 0)}<br>
      Status: ${record.status || '-'}<br>
      Identificador: ${record.id}
    `));
  });
}

export async function setBillingRecordAsPaid(recordId) {
  await markBillingRecordAsPaid(recordId);
}