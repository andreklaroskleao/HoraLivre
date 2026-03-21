import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import {
  listAppointmentsByTenant,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus
} from '../services/appointment-service.js';
import { listCustomersByTenant } from '../services/customer-service.js';
import { listServicesByTenant } from '../services/service-service.js';
import {
  formatCurrencyBRL,
  formatAppointmentStatus
} from '../utils/formatters.js';
import {
  required,
  isValidPrice
} from '../utils/validators.js';
import {
  clearElement,
  createListItem,
  showFeedback
} from '../utils/dom-utils.js';
import { formatDateTimeForDisplay } from '../utils/date-utils.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();

export async function renderTenantAppointmentsList(elementId = 'appointments-list') {
  const appointmentsListElement = document.getElementById(elementId);

  if (!appointmentsListElement) {
    return;
  }

  const appointments = await listAppointmentsByTenant(tenantId);

  clearElement(appointmentsListElement);

  if (appointments.length === 0) {
    appointmentsListElement.appendChild(createListItem(`
      <strong>Nenhum agendamento cadastrado</strong><br>
      Os agendamentos do seu negócio aparecerão aqui.
    `));
    return;
  }

  appointments.forEach((appointment) => {
    appointmentsListElement.appendChild(createListItem(`
      <strong>${appointment.customerName || '-'}</strong><br>
      Serviço: ${appointment.serviceName || '-'}<br>
      Início: ${formatDateTimeForDisplay(appointment.startAt)}<br>
      Fim: ${formatDateTimeForDisplay(appointment.endAt)}<br>
      Valor: ${formatCurrencyBRL(appointment.price || 0)}<br>
      Status: ${formatAppointmentStatus(appointment.status)}<br>
      Origem: ${appointment.source || '-'}<br>
      Observações: ${appointment.notes || '-'}<br>
      Identificador: ${appointment.id}
    `));
  });
}

export async function loadAppointmentFormDependencies() {
  const [customers, services] = await Promise.all([
    listCustomersByTenant(tenantId),
    listServicesByTenant(tenantId)
  ]);

  return { customers, services };
}

export async function submitCreateAppointment(formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const customerId = String(formData.get('customerId') || '').trim();
  const customerName = String(formData.get('customerName') || '').trim();
  const serviceId = String(formData.get('serviceId') || '').trim();
  const serviceName = String(formData.get('serviceName') || '').trim();
  const date = String(formData.get('date') || '').trim();
  const time = String(formData.get('time') || '').trim();
  const durationMinutes = Number(formData.get('durationMinutes') || 0);
  const price = Number(formData.get('price') || 0);
  const notes = String(formData.get('notes') || '').trim();

  if (!required(customerName)) {
    showFeedback(feedbackElement, 'Nome do cliente é obrigatório.', 'error');
    return false;
  }

  if (!required(serviceName)) {
    showFeedback(feedbackElement, 'Serviço é obrigatório.', 'error');
    return false;
  }

  if (!required(date) || !required(time)) {
    showFeedback(feedbackElement, 'Data e horário são obrigatórios.', 'error');
    return false;
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    showFeedback(feedbackElement, 'Duração inválida.', 'error');
    return false;
  }

  if (!isValidPrice(price)) {
    showFeedback(feedbackElement, 'Valor inválido.', 'error');
    return false;
  }

  const startAt = new Date(`${date}T${time}:00`).toISOString();
  const startDate = new Date(startAt);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const endAt = endDate.toISOString();

  await createAppointment({
    tenantId,
    customerId: customerId || null,
    customerName,
    serviceId: serviceId || null,
    serviceName,
    startAt,
    endAt,
    price,
    status: 'scheduled',
    source: 'panel',
    notes
  });

  formElement.reset();
  showFeedback(feedbackElement, 'Agendamento criado com sucesso.', 'success');
  return true;
}

export async function submitUpdateAppointment(appointmentId, formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const customerId = String(formData.get('customerId') || '').trim();
  const customerName = String(formData.get('customerName') || '').trim();
  const serviceId = String(formData.get('serviceId') || '').trim();
  const serviceName = String(formData.get('serviceName') || '').trim();
  const date = String(formData.get('date') || '').trim();
  const time = String(formData.get('time') || '').trim();
  const durationMinutes = Number(formData.get('durationMinutes') || 0);
  const price = Number(formData.get('price') || 0);
  const notes = String(formData.get('notes') || '').trim();
  const status = String(formData.get('status') || 'scheduled').trim();

  if (!required(customerName)) {
    showFeedback(feedbackElement, 'Nome do cliente é obrigatório.', 'error');
    return false;
  }

  if (!required(serviceName)) {
    showFeedback(feedbackElement, 'Serviço é obrigatório.', 'error');
    return false;
  }

  if (!required(date) || !required(time)) {
    showFeedback(feedbackElement, 'Data e horário são obrigatórios.', 'error');
    return false;
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    showFeedback(feedbackElement, 'Duração inválida.', 'error');
    return false;
  }

  if (!isValidPrice(price)) {
    showFeedback(feedbackElement, 'Valor inválido.', 'error');
    return false;
  }

  const startAt = new Date(`${date}T${time}:00`).toISOString();
  const startDate = new Date(startAt);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const endAt = endDate.toISOString();

  await updateAppointment(appointmentId, {
    customerId: customerId || null,
    customerName,
    serviceId: serviceId || null,
    serviceName,
    startAt,
    endAt,
    price,
    status,
    notes
  });

  showFeedback(feedbackElement, 'Agendamento atualizado com sucesso.', 'success');
  return true;
}

export async function setAppointmentStatus(appointmentId, status, feedbackElement = null) {
  await updateAppointmentStatus(appointmentId, status);

  if (feedbackElement) {
    showFeedback(
      feedbackElement,
      `Status alterado para ${formatAppointmentStatus(status)} com sucesso.`,
      'success'
    );
  }
}