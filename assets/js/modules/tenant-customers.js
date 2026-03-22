import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import {
  listCustomersByTenant,
  createCustomer,
  updateCustomer
} from '../services/customer-service.js';
import {
  formatCurrencyBRL,
  formatPhone,
  buildWhatsAppLink
} from '../utils/formatters.js';
import {
  required,
  isValidPhone,
  isValidEmail
} from '../utils/validators.js';
import {
  clearElement,
  showFeedback
} from '../utils/dom-utils.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();

export async function renderTenantCustomersList(elementId = 'customers-list') {
  const customersListElement = document.getElementById(elementId);

  if (!customersListElement) {
    return;
  }

  const customers = await listCustomersByTenant(tenantId);

  clearElement(customersListElement);

  if (customers.length === 0) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <strong>Nenhum cliente final cadastrado</strong><br>
      Os clientes do seu negócio aparecerão aqui.
    `;
    customersListElement.appendChild(listItem);
    return;
  }

  customers.forEach((customer) => {
    const whatsappLink = buildWhatsAppLink(
      customer.phone || '',
      `Olá ${customer.name || ''}, estou entrando em contato pela sua empresa no HoraLivre.`
    );

    const listItem = document.createElement('li');

    listItem.innerHTML = `
      <div class="customer-card">
        <div class="customer-card-header">
          <strong>${customer.name}</strong>
        </div>

        <div class="customer-card-body">
          <div>Telefone: ${formatPhone(customer.phone || '-')}</div>
          <div>E-mail: ${customer.email || '-'}</div>
          <div>Total de atendimentos: ${customer.totalAppointments || 0}</div>
          <div>Total gasto: ${formatCurrencyBRL(customer.totalSpent || 0)}</div>
          <div>Último atendimento: ${customer.lastAppointmentAt || '-'}</div>
          <div>Observações: ${customer.notes || '-'}</div>
          <div>Identificador: ${customer.id}</div>
        </div>

        <div class="customer-actions">
          <a class="button primary" href="${whatsappLink}" target="_blank" rel="noopener noreferrer">
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    `;

    customersListElement.appendChild(listItem);
  });
}

export async function submitCreateCustomer(formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!required(name)) {
    showFeedback(feedbackElement, 'Nome do cliente é obrigatório.', 'error');
    return false;
  }

  if (!required(phone) || !isValidPhone(phone)) {
    showFeedback(feedbackElement, 'Telefone inválido.', 'error');
    return false;
  }

  if (email && !isValidEmail(email)) {
    showFeedback(feedbackElement, 'E-mail inválido.', 'error');
    return false;
  }

  await createCustomer({
    tenantId,
    name,
    phone,
    email,
    notes,
    totalAppointments: 0,
    totalSpent: 0,
    lastAppointmentAt: null
  });

  formElement.reset();
  showFeedback(feedbackElement, 'Cliente cadastrado com sucesso.', 'success');
  return true;
}

export async function submitUpdateCustomer(customerId, formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const notes = String(formData.get('notes') || '').trim();

  if (!required(name)) {
    showFeedback(feedbackElement, 'Nome do cliente é obrigatório.', 'error');
    return false;
  }

  if (!required(phone) || !isValidPhone(phone)) {
    showFeedback(feedbackElement, 'Telefone inválido.', 'error');
    return false;
  }

  if (email && !isValidEmail(email)) {
    showFeedback(feedbackElement, 'E-mail inválido.', 'error');
    return false;
  }

  await updateCustomer(customerId, {
    name,
    phone,
    email,
    notes
  });

  showFeedback(feedbackElement, 'Cliente atualizado com sucesso.', 'success');
  return true;
}