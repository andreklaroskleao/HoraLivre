import { requireTenantUser } from '../utils/guards.js';
import { getTenantId } from '../state/session-store.js';
import {
  listServicesByTenant,
  createService,
  updateService,
  toggleServiceActive
} from '../services/service-service.js';
import { formatCurrencyBRL } from '../utils/formatters.js';
import {
  required,
  isValidPrice,
  isValidDuration
} from '../utils/validators.js';
import {
  clearElement,
  createListItem,
  showFeedback
} from '../utils/dom-utils.js';

if (!requireTenantUser()) {
  throw new Error('Acesso negado.');
}

const tenantId = getTenantId();

export async function renderTenantServicesList(elementId = 'services-list') {
  const servicesListElement = document.getElementById(elementId);

  if (!servicesListElement) {
    return;
  }

  const services = await listServicesByTenant(tenantId);

  clearElement(servicesListElement);

  if (services.length === 0) {
    servicesListElement.appendChild(createListItem(`
      <strong>Nenhum serviço cadastrado</strong><br>
      Cadastre o primeiro serviço para usar na agenda e na página pública.
    `));
    return;
  }

  services.forEach((service) => {
    servicesListElement.appendChild(createListItem(`
      <strong>${service.name}</strong><br>
      Descrição: ${service.description || '-'}<br>
      Duração: ${service.durationMinutes || 0} min<br>
      Valor: ${formatCurrencyBRL(service.price || 0)}<br>
      Ativo: ${service.isActive ? 'Sim' : 'Não'}<br>
      Identificador: ${service.id}
    `));
  });
}

export async function submitCreateService(formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const durationMinutes = Number(formData.get('durationMinutes') || 0);
  const price = Number(formData.get('price') || 0);
  const isActive = formData.get('isActive') === 'true';

  if (!required(name)) {
    showFeedback(feedbackElement, 'Nome do serviço é obrigatório.', 'error');
    return false;
  }

  if (!isValidDuration(durationMinutes)) {
    showFeedback(feedbackElement, 'Duração inválida.', 'error');
    return false;
  }

  if (!isValidPrice(price)) {
    showFeedback(feedbackElement, 'Preço inválido.', 'error');
    return false;
  }

  await createService({
    tenantId,
    name,
    description,
    durationMinutes,
    price,
    isActive
  });

  formElement.reset();
  showFeedback(feedbackElement, 'Serviço criado com sucesso.', 'success');
  return true;
}

export async function submitUpdateService(serviceId, formElement, feedbackElement) {
  const formData = new FormData(formElement);

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const durationMinutes = Number(formData.get('durationMinutes') || 0);
  const price = Number(formData.get('price') || 0);
  const isActive = formData.get('isActive') === 'true';

  if (!required(name)) {
    showFeedback(feedbackElement, 'Nome do serviço é obrigatório.', 'error');
    return false;
  }

  if (!isValidDuration(durationMinutes)) {
    showFeedback(feedbackElement, 'Duração inválida.', 'error');
    return false;
  }

  if (!isValidPrice(price)) {
    showFeedback(feedbackElement, 'Preço inválido.', 'error');
    return false;
  }

  await updateService(serviceId, {
    name,
    description,
    durationMinutes,
    price,
    isActive
  });

  showFeedback(feedbackElement, 'Serviço atualizado com sucesso.', 'success');
  return true;
}

export async function setServiceActiveStatus(serviceId, isActive, feedbackElement = null) {
  await toggleServiceActive(serviceId, isActive);

  if (feedbackElement) {
    showFeedback(
      feedbackElement,
      isActive ? 'Serviço ativado com sucesso.' : 'Serviço desativado com sucesso.',
      'success'
    );
  }
}