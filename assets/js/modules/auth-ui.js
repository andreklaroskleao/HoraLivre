import { loginWithEmail } from '../services/auth-service.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageEl = document.getElementById('auth-message');
const demoAdminButton = document.getElementById('demo-admin');
const demoTenantButton = document.getElementById('demo-tenant');

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'feedback error' : 'feedback success';
}

function redirectByRole(session) {
  if (session.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  window.location.href = 'cliente.html';
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage('Preencha e-mail e senha.', true);
      return;
    }

    const session = await loginWithEmail(email, password);
    showMessage('Login realizado com sucesso.');
    redirectByRole(session);
  } catch (error) {
    showMessage('Não foi possível entrar.', true);
    console.error(error);
  }
});

demoAdminButton?.addEventListener('click', async () => {
  const session = await loginWithEmail('admin@horalivre.com');
  redirectByRole(session);
});

demoTenantButton?.addEventListener('click', async () => {
  const session = await loginWithEmail('cliente@demo.com');
  redirectByRole(session);
});