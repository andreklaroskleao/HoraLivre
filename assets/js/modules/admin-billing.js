import { requireAdmin } from '../utils/guards.js';
import { listTenants } from '../services/tenant-service.js';
import {
  getBillingSettingsByTenant,
  calculateBillingForPeriod,
  generateBillingRecord,
  listBillingRecords,
  markBillingRecordAsPaid
} from '../services/billing-service.js';
import { countCompletedAppointments } from '../services/appointment-service.js';
import { formatCurrencyBRL } from '../utils/formatters.js';
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

    await generateBillingRecord({
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

  records.forEach((record) => {
    element.appendChild(createListItem(`
      <strong>${record.monthRef}</strong><br>
      Tenant: ${record.tenantId}<br>
      Modo: ${record.billingMode || '-'}<br>
      Concluídos: ${record.completedAppointments || 0}<br>
      Total: ${formatCurrencyBRL(record.totalAmount || 0)}<br>
      Status: ${record.status || '-'}
    `));
  });
}

export async function setBillingRecordAsPaid(recordId) {
  await markBillingRecordAsPaid(recordId);
}