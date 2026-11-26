'use strict';

const form = document.getElementById('login-form');
const title = document.getElementById('login-title');
const modeCopy = document.getElementById('login-mode-copy');
const displayNameInput = document.getElementById('display-name');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const displayNameField = document.getElementById('display-name-field');
const usernameField = document.getElementById('username-field');
const passwordField = document.getElementById('password-field');
const confirmPasswordField = document.getElementById('confirm-password-field');
const errorBox = document.getElementById('login-error');
const submitButton = document.getElementById('login-button');
const toggleButton = document.getElementById('toggle-password');
const eyeOpen = document.getElementById('eye-open');
const eyeClosed = document.getElementById('eye-closed');
const card = document.getElementById('login-card');
const companyLabel = document.getElementById('login-company');
const setupFields = [displayNameField, confirmPasswordField];
let setupRequired = false;

function setSetupMode(required) {
  setupRequired = required;
  title.textContent = required ? 'Set up administrator' : 'Sign in';
  document.title = required ? 'Set up · Docker HRMS' : 'Sign in · Docker HRMS';
  modeCopy.hidden = !required;
  for (const field of setupFields) field.hidden = !required;
  displayNameInput.required = required;
  confirmPasswordInput.required = required;
  passwordInput.autocomplete = required ? 'new-password' : 'current-password';
  submitButton.textContent = required ? 'Create administrator' : 'Sign in';
  (required ? displayNameInput : usernameInput).focus();
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  for (const field of [displayNameField, usernameField, passwordField, confirmPasswordField]) {
    field.classList.remove('invalid');
  }
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy
    ? setupRequired ? 'Creating…' : 'Signing in…'
    : setupRequired ? 'Create administrator' : 'Sign in';
}

toggleButton.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  toggleButton.setAttribute('aria-pressed', String(!showing));
  toggleButton.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  eyeOpen.hidden = !showing;
  eyeClosed.hidden = showing;
  passwordInput.focus();
});

for (const input of [displayNameInput, usernameInput, passwordInput, confirmPasswordInput]) {
  input.addEventListener('input', hideError);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const displayName = displayNameInput.value.trim();
  const confirmation = confirmPasswordInput.value;

  if (setupRequired) {
    if (!displayName) {
      displayNameField.classList.add('invalid');
      showError('Enter the administrator’s name.');
      displayNameInput.focus();
      return;
    }
    if (!/^[a-z0-9._-]{3,40}$/i.test(username)) {
      usernameField.classList.add('invalid');
      showError('Username must be 3–40 characters: letters, numbers, dots, dashes or underscores.');
      usernameInput.focus();
      return;
    }
    if (password.length < 8) {
      passwordField.classList.add('invalid');
      showError('The password must be at least 8 characters.');
      passwordInput.focus();
      return;
    }
    if (password !== confirmation) {
      confirmPasswordField.classList.add('invalid');
      showError('The passwords do not match.');
      confirmPasswordInput.focus();
      return;
    }
  } else if (!username || !password) {
    if (!username) usernameField.classList.add('invalid');
    if (!password) passwordField.classList.add('invalid');
    showError('Enter your username and password.');
    (username ? passwordInput : usernameInput).focus();
    return;
  }

  setBusy(true);
  try {
    const response = await fetch(setupRequired ? '/api/setup' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setupRequired ? { displayName, username, password } : { username, password }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.ok) {
      window.location.replace('/app');
      return;
    }
    if (response.status === 409 && data.setupRequired) {
      setSetupMode(true);
      showError(data.error || 'Create the administrator account first.');
      return;
    }

    passwordInput.value = '';
    confirmPasswordInput.value = '';
    passwordInput.focus();

    if (!setupRequired && response.status === 401) {
      showError('Incorrect username or password.');
    } else if (response.status === 429) {
      showError(data.error || 'Too many attempts. Wait a minute and try again.');
    } else {
      showError(data.error || (setupRequired ? 'Setup failed. Please try again.' : 'Sign-in failed. Please try again.'));
    }
  } catch {
    showError('Cannot reach the HRMS server. Make sure it is running, then try again.');
  } finally {
    setBusy(false);
  }
});

Promise.all([
  fetch('/api/branding').then((response) => (response.ok ? response.json() : null)).catch(() => null),
  fetch('/api/setup-status').then((response) => (response.ok ? response.json() : null)).catch(() => null),
]).then(([branding, setup]) => {
  if (branding && branding.companyName) companyLabel.textContent = branding.companyName;
  setSetupMode(Boolean(setup && setup.setupRequired));
});
