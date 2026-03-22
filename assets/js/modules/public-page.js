import { getQueryParam } from '../utils/router.js';
import {
  setText,
  showFeedback,
  clearElement
} from '../utils/dom-utils.js';
import {
  formatCurrencyBRL,
  formatPhone,
  buildWhatsAppLink
} from '../utils/formatters.js';
import {
  listPublicServices,
  getPublicTenantBySlug,
  createPublicBooking,
  listBusyPublicAppointmentsByDate
} from '../services/public-booking-service.js';
import {
  required,
  isValidPhone
} from '../utils/validators.js';

const slug = getQueryParam('slug');

const servicesList = document.getElementById('public-services-list');
const bookingForm = document.getElementById('public-booking-form');
const bookingFeedback = document.getElementById('booking-feedback');
const bookingServiceSelect = document.getElementById('booking-service');
const bookingDateInput = document.getElementById('booking-date');
const bookingTimeInput = document.getElementById('booking-time');
const availableTimesContainer = document.getElementById('available-times');

let loadedServices = [];
let loadedTenant = null;

function generateBaseTimeSlots() {
  const slots = [];
  const startHour = 8;
  const endHour = 19;

  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === endHour && minute > 0) {
        continue;
      }

      const formattedHour = String(hour).padStart(2, '0');
      const formattedMinute = String(minute).padStart(2, '0');
      slots.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  return slots;
}

function renderBookingSuccessSummary({
  customerName,
  serviceName,
  date,
  time
}) {
  if (!loadedTenant) {
    return;
  }

  const whatsappLink = buildWhatsAppLink(
    loadedTenant.whatsapp || '',
    `Olá, acabei de realizar um agendamento no HoraLivre. Meu nome é ${customerName}.`
  );

  bookingFeedback.innerHTML = `
    <div class="card" style="margin-top: 12px;">
      <strong>Agendamento criado com sucesso.</strong><br><br>
      Empresa: ${loadedTenant.businessName || '-'}<br>
      Cliente: ${customerName || '-'}<br>
      Serviço: ${serviceName || '-'}<br>
      Data: ${date || '-'}<br>
      Horário: ${time || '-'}<br><br>
      <a class="button primary" href="${whatsappLink}" target="_blank" rel="noopener noreferrer">
        Falar com a empresa no WhatsApp
      </a>
    </div>
  `;

  bookingFeedback.className = 'feedback success';
}

async function renderAvailableTimeSlots() {
  const selectedDate = bookingDateInput.value;

  clearElement(availableTimesContainer);
  bookingTimeInput.value = '';

  if (!selectedDate) {
    return;
  }

  const busyAppointments = await listBusyPublicAppointmentsByDate(slug, selectedDate);
  const busyTimes = busyAppointments.map((appointment) =>
    new Date(appointment.startAt).toISOString().slice(11, 16)
  );

  const slots = generateBaseTimeSlots();

  slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = slot;
    button.className = 'time-button';

    const isBusy = busyTimes.includes(slot);

    if (isBusy) {
      button.classList.add('disabled');
      button.disabled = true;
    }

    button.addEventListener('click', () => {
      const buttons = availableTimesContainer.querySelectorAll('.time-button');

      buttons.forEach((currentButton) => currentButton.classList.remove('selected'));
      button.classList.add('selected');
      bookingTimeInput.value = slot;
    });

    availableTimesContainer.appendChild(button);
  });
}

async function loadPublicTenant() {
  const tenant = await getPublicTenantBySlug(slug);

  if (!tenant) {
    throw new Error('Página pública não encontrada.');
  }

  loadedTenant = tenant;

  setText('public-business-name', tenant.businessName || '-');
  setText('public-description', tenant.description || '-');
  setText('public-whatsapp', formatPhone(tenant.whatsapp || '-'));
  setText('public-slug', tenant.slug || '-');
}

async function loadPublicServicesData() {
  loadedServices = await listPublicServices(slug);

  clearElement(servicesList);
  bookingServiceSelect.innerHTML = '<option value="">Selecione um serviço</option>';

  loadedServices.forEach((service) => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <strong>${service.name}</strong><br>
      Duração: ${service.durationMinutes || 0} min<br>
      Valor: ${formatCurrencyBRL(service.price || 0)}
    `;
    servicesList.appendChild(listItem);

    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} - ${formatCurrencyBRL(service.price || 0)}`;
    bookingServiceSelect.appendChild(option);
  });
}

bookingDateInput?.addEventListener('change', async () => {
  try {
    await renderAvailableTimeSlots();
  } catch (error) {
    console.error(error);
    showFeedback(
      bookingFeedback,
      error.message || 'Não foi possível carregar os horários disponíveis.',
      'error'
    );
  }
});

bookingForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const customerName = document.getElementById('booking-name').value.trim();
    const customerPhone = document.getElementById('booking-phone').value.trim();
    const customerEmail = '';
    const serviceId = bookingServiceSelect.value;
    const date = bookingDateInput.value;
    const time = bookingTimeInput.value;

    if (!required(customerName) || !required(customerPhone) || !required(serviceId) || !required(date) || !required(time)) {
      showFeedback(bookingFeedback, 'Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    if (!isValidPhone(customerPhone)) {
      showFeedback(bookingFeedback, 'Telefone inválido.', 'error');
      return;
    }

    const selectedService = loadedServices.find((service) => service.id === serviceId);

    if (!selectedService) {
      showFeedback(bookingFeedback, 'Serviço não encontrado.', 'error');
      return;
    }

    await createPublicBooking({
      slug,
      customerName,
      customerPhone,
      customerEmail,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date,
      time,
      durationMinutes: selectedService.durationMinutes,
      price: selectedService.price
    });

    bookingForm.reset();
    clearElement(availableTimesContainer);

    renderBookingSuccessSummary({
      customerName,
      serviceName: selectedService.name,
      date,
      time
    });
  } catch (error) {
    console.error(error);
    showFeedback(
      bookingFeedback,
      error.message || 'Não foi possível criar o agendamento.',
      'error'
    );
  }
});

async function init() {
  try {
    if (!slug) {
      throw new Error('Slug não informado.');
    }

    await loadPublicTenant();
    await loadPublicServicesData();
  } catch (error) {
    console.error(error);
    showFeedback(
      bookingFeedback,
      error.message || 'Não foi possível carregar a página pública.',
      'error'
    );
  }
}

init();