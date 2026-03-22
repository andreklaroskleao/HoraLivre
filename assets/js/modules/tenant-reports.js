import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import { getTenantById } from '../services/tenant-service.js';
import { getPlanById } from '../services/plan-service.js';
import {
  getBillingSettingsByTenant,
  listBillingRecordsByTenant,
  calculateBillingForPeriod
} from '../services/billing-service.js';
import {
  countCompletedAppointments,
  listAppointmentsByTenantAndPeriod
} from '../services/appointment-service.js';
import {
  formatCurrencyBRL,
  formatAppointmentStatus
} from '../utils/formatters.js';
import {
  getMonthReference,
  getStartAndEndOfCurrentMonth,
  formatDateTimeForDisplay
} from '../utils/date-utils.js';
import {
  clearElement,
  createListItem,
  setText
} from '../utils/dom-utils.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();

export async function loadTenantReportsIntoPage(options = {}) {
  const reportCompletedElementId = options.reportCompletedElementId || 'report-completed';
  const reportTotalElementId = options.reportTotalElementId || 'report-total';
  const reportStatusElementId = options.reportStatusElementId || 'report-status';
  const reportAppointmentsListElementId = options.reportAppointmentsListElementId || 'report-appointments-list';

  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    throw new Error('Tenant não encontrado.');
  }

  const plan = tenant.planId ? await getPlanById(tenant.planId) : null;

  if (plan && plan.reportsEnabled === false) {
    setText(reportCompletedElementId, 'Indisponível no plano');
    setText(reportTotalElementId, 'Indisponível no plano');
    setText(reportStatusElementId, 'Indisponível no plano');
    return;
  }

  const { startIso, endIso } = getStartAndEndOfCurrentMonth();
  const monthReference = getMonthReference();
  const billingSettings = await getBillingSettingsByTenant(tenantId);
  const completedAppointments = await countCompletedAppointments(tenantId, startIso, endIso);
  const appointments = await listAppointmentsByTenantAndPeriod(tenantId, startIso, endIso);
  const billingRecords = await listBillingRecordsByTenant(tenantId);

  const currentBillingRecord =
    billingRecords.find((record) => record.monthRef === monthReference) || null;

  const calculatedTotal = calculateBillingForPeriod({
    billingMode: tenant.billingMode,
    completedAppointments,
    fixedMonthlyPrice: billingSettings?.fixedMonthlyPrice || 0,
    pricePerExecutedService: billingSettings?.pricePerExecutedService || 0
  });

  setText(reportCompletedElementId, String(completedAppointments));
  setText(
    reportTotalElementId,
    formatCurrencyBRL(currentBillingRecord?.totalAmount ?? calculatedTotal)
  );
  setText(reportStatusElementId, currentBillingRecord?.status || 'pending');

  const reportAppointmentsListElement = document.getElementById(reportAppointmentsListElementId);

  if (!reportAppointmentsListElement) {
    return;
  }

  clearElement(reportAppointmentsListElement);

  if (appointments.length === 0) {
    reportAppointmentsListElement.appendChild(createListItem(`
      <strong>Nenhum agendamento no período</strong><br>
      Os agendamentos do mês aparecerão aqui.
    `));
    return;
  }

  appointments.forEach((appointment) => {
    reportAppointmentsListElement.appendChild(createListItem(`
      <strong>${appointment.customerName || '-'}</strong><br>
      Serviço: ${appointment.serviceName || '-'}<br>
      Início: ${formatDateTimeForDisplay(appointment.startAt)}<br>
      Valor: ${formatCurrencyBRL(appointment.price || 0)}<br>
      Status: ${formatAppointmentStatus(appointment.status)}
    `));
  });
}