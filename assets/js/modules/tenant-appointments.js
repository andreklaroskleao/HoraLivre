import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import {
  listAppointmentsByTenant,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus
} from '../services/appointment-service.js';
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
    const emptyItem = document.createElement('li');
    emptyItem.innerHTML = `
      <strong>Nenhum agendamento cadastrado</strong><br>
      Os agendamentos do seu negócio aparecerão aqui.
    `;
    appointmentsListElement.appendChild(emptyItem);
    return;
  }

  appointments.forEach((appointment) => {
    const listItem = document.createElement('li');

    listItem.innerHTML = `
      <div class="appointment-card">
        <div class="appointment-card-header">
          <strong>${appointment.customerName || '-'}</strong>
          <span class="status-badge">${formatAppointmentStatus(appointment.status)}</span>
        </div>

        <div class="appointment-card-body">
          <div>Serviço: ${appointment.serviceName || '-'}</div>
          <div>Início: ${formatDateTimeForDisplay(appointment.startAt)}</div>
          <div>Fim: ${formatDateTimeForDisplay(appointment.endAt)}</div>
          <div>Valor: ${formatCurrencyBRL(appointment.price || 0)}</div>
          <div>Origem: ${appointment.source || '-'}</div>
          <div>Observações: ${appointment.notes || '-'}</div>
          <div>Identificador: ${appointment.id}</div>
        </div>

        <div class="appointment-actions">
          <button class="button" type="button" data-appointment-id="${appointment.id}" data-status="confirmed">
            Confirmar
          </button>
          <button class="button primary" type="button" data-appointment-id="${appointment.id}" data-status="completed">
            Concluir
          </button>
          <button class="button" type="button" data-appointment-id="${appointment.id}" data-status="canceled">
            Cancelar
          </button>
          <button class="button danger" type="button" data-appointment-id="${appointment.id}" data-status="no_show">
            Faltou
          </button>
        </div>
      </div>
    `;

    appointmentsListElement.appendChild(listItem);
  });

  bindAppointmentStatusButtons(elementId);
}

function bindAppointmentStatusButtons(elementId = 'appointments-list') {
  const container = document.getElementById(elementId);

  if (!container) {
    return;
  }

  const buttons = container.querySelectorAll('[data-appointment-id][data-status]');

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const appointmentId = button.getAttribute('data-appointment-id');
      const status = button.getAttribute('data-status');

      try {
        await setAppointmentStatus(appointmentId, status);
        await renderTenantAppointmentsList(elementId);

        const appointmentFeedbackElement = document.getElementById('appointment-feedback');

        if (appointmentFeedbackElement) {
          showFeedback(
            appointmentFeedbackElement,
            `Status alterado para ${formatAppointmentStatus(status)} com sucesso.`,
            'success'
          );
        }
      } catch (error) {
        console.error(error);

        const appointmentFeedbackElement = document.getElementById('appointment-feedback');

        if (appointmentFeedbackElement) {
          showFeedback(
            appointmentFeedbackElement,
            error.message || 'Não foi possível alterar o status do agendamento.',
            'error'
          );
        }
      }
    });
  });
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

export async function setAppointmentStatus(appointmentId, status) {
  await updateAppointmentStatus(appointmentId, status);
}