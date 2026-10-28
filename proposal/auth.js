// RelayGuard Client Authentication & Session Management
// Handles mock-persistent auth state, validation, session storage, and route protections

const AUTH_STORAGE_KEY = 'relayguard_auth_user';
const USERS_DB_KEY = 'relayguard_registered_users';

// Default mock user
const DEFAULT_USER = {
  id: 'usr_lead_992',
  name: 'Sam Wilson',
  email: 'sam@acme.com',
  role: 'Lead Reliability Engineer',
  organization: 'Acme App'
};

function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [DEFAULT_USER];
}

function saveRegisteredUser(user) {
  const users = getRegisteredUsers();
  users.push(user);
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {}
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function setCurrentUser(user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {}
}

function clearCurrentUser() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {}
}

// Redirect guards
function requireAuth(redirectUrl = 'login.html') {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = redirectUrl;
  }
  return user;
}

function redirectIfAuthenticated(dashboardUrl = 'index.html') {
  const user = getCurrentUser();
  if (user) {
    window.location.href = dashboardUrl;
  }
}

// Sign Out Action
function signOutUser() {
  clearCurrentUser();
  window.location.href = 'landing.html';
}

// Toggle password visibility
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="icon-control"></i>`;
  if (window.lucide) window.lucide.createIcons();
}
