'use strict';

const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const usernameField = document.getElementById('username-field');
const passwordField = document.getElementById('password-field');
const errorBox = document.getElementById('login-error');
const submitButton = document.getElementById('login-button');
const toggleButton = document.getElementById('toggle-password');
const eyeOpen = document.getElementById('eye-open');
const eyeClosed = document.getElementById('eye-closed');
const card = document.getElementById('login-card');
const companyLabel = document.getElementById('login-company');

fetch('/api/branding')
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => {
    if (data && data.companyName) companyLabel.textContent = data.companyName;
  })
  .catch(() => {
    /* keep the default name */
  });

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
  usernameField.classList.remove('invalid');
  passwordField.classList.remove('invalid');
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Signing in…' : 'Sign in';
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

usernameInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    if (!username) usernameField.classList.add('invalid');
    if (!password) passwordField.classList.add('invalid');
    showError('Enter your username and password.');
    (username ? passwordInput : usernameInput).focus();
    return;
  }

  setBusy(true);
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
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

    passwordInput.value = '';
    passwordInput.focus();

    if (response.status === 401) {
      showError('Incorrect username or password.');
    } else if (response.status === 429) {
      showError(data.error || 'Too many attempts. Wait a minute and try again.');
    } else {
      showError(data.error || 'Sign-in failed. Please try again.');
    }
  } catch {
    showError('Cannot reach the HRMS server. Make sure it is running, then try again.');
  } finally {
    setBusy(false);
  }
});
