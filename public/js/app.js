'use strict';

const $ = (id) => document.getElementById(id);

const ROUTES = {
  '/app': { title: 'Dashboard', view: 'view-dashboard' },
  '/employees': { title: 'Employees', view: 'view-employees' },
  '/health-records': { title: 'Health records', view: 'view-health' },
  '/training': { title: 'Training records', view: 'view-training' },
  '/expatriates': { title: 'Expatriate Monitor', view: 'view-expatriates' },
  '/reports': { title: 'HR reports', view: 'view-reports' },
  '/reminders': { title: 'Reminders', view: 'view-reminders' },
  '/departments': { title: 'Departments', view: 'view-departments' },
  '/payroll': { title: 'Payroll', view: 'view-payroll' },
  '/leave': { title: 'Leave', view: 'view-leave' },
  '/bank-ssnit': { title: 'Bank & SSNIT', view: 'view-bank' },
  '/users': { title: 'Users & roles', view: 'view-users' },
  '/admin': { title: 'Admin', view: 'view-admin' },
};

const BANKS = [
  'Absa', 'Access Bank', 'Agricultural Development Bank', 'CalBank', 'Consolidated Bank Ghana',
  'Ecobank', 'Fidelity Bank', 'GCB Bank', 'National Investment Bank', 'Republic Bank',
  'Standard Chartered', 'Stanbic Bank', 'Zenith Bank',
];

const DEFAULT_PAYROLL_TAXES = {
  ssnitEmployeeRate: 5.5,
  ssnitEmployerRate: 13,
  payeBands: [
    { width: 490, rate: 0 },
    { width: 110, rate: 5 },
    { width: 130, rate: 10 },
    { width: 3166.67, rate: 17.5 },
    { width: 16000, rate: 25 },
    { width: 30520, rate: 30 },
    { width: null, rate: 35 },
  ],
};

const ALLOWED_DOC_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_DOC_BYTES = 6 * 1024 * 1024;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const state = {
  user: null,
  employees: null,
  employeesLoaded: false,
  departments: [],
  bankRows: [],
  employeeList: [],
  trainingRows: [],
  healthRows: [],
  expatriates: { employees: [], stats: {} },
  reminders: { birthdays: [], tasks: [] },
  users: [],
  backups: [],
  restoreBackupName: null,
  editingUserId: null,
  resetPasswordUserId: null,
  reportMatches: [],
  reportProfile: null,
  editingEmployeeId: null,
  employeeProfile: null,
  editingTrainingId: null,
  editingExpatId: null,
  editingDepartment: null,
  editingUnit: null,
  unitDepartmentId: null,
  expandedDepartment: null,
  payrollRuns: [],
  payrollTaxes: DEFAULT_PAYROLL_TAXES,
  payrollRun: null,
  payrollRunId: null,
  editingPayslipId: null,
  payslip: null,
  bankEmployeeId: null,
  confirmAction: null,
  confirmBusyLabel: null,
  pendingPhoto: null,
  removePhoto: false,
  seq: 0,
  empSeq: 0,
  trainingSeq: 0,
  healthSeq: 0,
  reportSeq: 0,
  deptSeq: 0,
  payrollSeq: 0,
  payrollDetailSeq: 0,
  bankSeq: 0,
  leaveRequests: [],
  leaveYear: String(new Date().getFullYear()),
  leaveSeq: 0,
  leaveDecision: null,
};

let departmentsLoaded = false;

const toastEl = $('toast');

const employeeDialog = $('employee-dialog');
const employeeForm = $('employee-form');
const employeeError = $('employee-error');
const employeeSubmit = $('employee-submit');

const departmentDialog = $('department-dialog');
const departmentForm = $('department-form');
const departmentError = $('department-error');
const departmentSubmit = $('department-submit');

const unitDialog = $('unit-dialog');
const unitForm = $('unit-form');
const unitError = $('unit-error');
const unitSubmit = $('unit-submit');

const bankDialog = $('bank-dialog');
const bankForm = $('bank-form');
const bankError = $('bank-error');
const bankSubmit = $('bank-submit');

const trainingDialog = $('training-dialog');
const trainingForm = $('training-form');
const trainingError = $('training-error');
const trainingSubmit = $('training-submit');

const healthDialog = $('health-dialog');
const healthForm = $('health-form');
const healthError = $('health-error');
const healthSubmit = $('health-submit');

const expatDialog = $('expat-dialog');
const expatForm = $('expat-form');
const expatError = $('expat-error');
const expatSubmit = $('expat-submit');

const reminderDialog = $('reminder-dialog');
const reminderForm = $('reminder-form');
const reminderError = $('reminder-error');
const reminderSubmit = $('reminder-submit');

const confirmDialog = $('confirm-dialog');
const confirmError = $('confirm-error');
const confirmSubmit = $('confirm-submit');

const logoDialog = $('logo-dialog');
const logoForm = $('logo-form');
const logoFile = $('logo-file');
const logoPreview = $('logo-preview');
const logoError = $('logo-error');
const logoSubmit = $('logo-submit');

const companyDialog = $('company-dialog');
const companyForm = $('company-form');
const companyError = $('company-error');
const companySubmit = $('company-submit');

const payrollTaxesForm = $('payroll-taxes-form');
const payrollTaxesError = $('payroll-taxes-error');
const payrollTaxesStatus = $('payroll-taxes-status');
const payrollTaxesSubmit = $('payroll-taxes-submit');

const passwordDialog = $('password-dialog');
const passwordForm = $('password-form');
const passwordError = $('password-error');
const passwordSubmit = $('password-submit');

const userDialog = $('user-dialog');
const userForm = $('user-form');
const userError = $('user-error');
const userSubmit = $('user-submit');

const userPasswordDialog = $('user-password-dialog');
const userPasswordForm = $('user-password-form');
const userPasswordError = $('user-password-error');
const userPasswordSubmit = $('user-password-submit');

const payrollDialog = $('payroll-dialog');
const payrollForm = $('payroll-form');
const payrollError = $('payroll-error');
const payrollSubmit = $('payroll-submit');

const payslipEditDialog = $('payslip-edit-dialog');
const payslipEditForm = $('payslip-edit-form');
const payslipEditError = $('payslip-edit-error');
const payslipEditSubmit = $('payslip-edit-submit');

const payrollDaysDialog = $('payroll-days-dialog');
const payrollDaysForm = $('payroll-days-form');
const payrollDaysError = $('payroll-days-error');
const payrollDaysSubmit = $('payroll-days-submit');

const leaveDialog = $('leave-dialog');
const leaveForm = $('leave-form');
const leaveError = $('leave-error');
const leaveSubmit = $('leave-submit');

const leaveDecisionDialog = $('leave-decision-dialog');
const leaveDecisionForm = $('leave-decision-form');
const leaveDecisionError = $('leave-decision-error');
const leaveDecisionSubmit = $('leave-decision-submit');

const userBtn = $('user-btn');
const userMenu = $('user-menu-pop');

let toastTimer = null;

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.replace('/');
    const err = new Error('Please sign in.');
    err.status = 401;
    throw err;
  }
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = response.status;
    throw err;
  }
  return data;
}

function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function option(value, label) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'HR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(role) {
  if (role === 'admin') return 'Administrator';
  if (role === 'hr') return 'HR user';
  if (role === 'head') return 'Department head';
  if (role === 'employee') return 'Employee';
  if (role === 'supervisor') return 'Supervisor';
  if (role === 'gm') return 'General manager';
  if (role === 'nurse') return 'Nurse';
  if (role === 'viewer') return 'Viewer';
  return role;
}

function isAdmin() {
  return !!state.user && state.user.role === 'admin';
}

function isHr() {
  return !!state.user && (state.user.role === 'admin' || state.user.role === 'hr');
}

function isHead() {
  return !!state.user && state.user.role === 'head';
}

function isEmployee() {
  return !!state.user && state.user.role === 'employee';
}

function isSupervisor() {
  return !!state.user && state.user.role === 'supervisor';
}

function isGm() {
  return !!state.user && state.user.role === 'gm';
}

function isNurse() {
  return !!state.user && state.user.role === 'nurse';
}

function canEdit() {
  return !!state.user && (state.user.role === 'admin' || state.user.role === 'hr');
}

function canApplyLeave() {
  return !!state.user && ['admin', 'hr', 'head', 'employee', 'supervisor'].includes(state.user.role);
}

function isDepartmentViewer() {
  return isHead() || isSupervisor();
}

function rolePages(role) {
  return {
    nurse: ['/app', '/health-records'],
    head: ['/app', '/employees', '/leave', '/training'],
    employee: ['/app', '/employees', '/leave'],
    supervisor: ['/app', '/employees', '/leave'],
    gm: ['/app', '/leave'],
  }[role] || null;
}

function canManageHealth() {
  return !!state.user && ['admin', 'hr', 'nurse'].includes(state.user.role);
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const numberFormat = new Intl.NumberFormat('en-US');

const moneyFormat = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value) {
  return moneyFormat.format(Number(value) || 0);
}

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatStamp(value) {
  if (!value) return '—';
  const text = String(value);
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function offsetISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function plural(count, one, many) {
  return count === 1 ? one : many;
}

function daysLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

function ageFromDate(iso) {
  if (!iso) return null;
  const birth = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

function serviceYears(iso) {
  if (!iso) return null;
  const start = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return Math.max(0, (Date.now() - start) / 31557600000);
}

function dash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function statusTag(status) {
  const map = {
    valid: ['Valid', 'status-ok'],
    expiring: ['Expiring', 'status-warn'],
    expired: ['Expired', 'status-bad'],
    missing: ['Not recorded', 'status-none'],
  };
  const [label, className] = map[status] || map.missing;
  return el('span', `status-tag ${className}`, label);
}

function renderUser(user) {
  userBtn.textContent = initials(user.displayName || user.username);
  userBtn.setAttribute('aria-label', `Account menu for ${user.displayName || user.username}`);
  $('menu-name').textContent = user.displayName || user.username;
  $('menu-role').textContent = roleLabel(user.role);
  $('users-nav-link').hidden = user.role !== 'admin';
  $('admin-nav-link').hidden = user.role !== 'admin';
  $('brand-company-btn').disabled = user.role !== 'admin';
  applyRoleGating();
}

function applyRoleGating() {
  const editable = canEdit();
  const healthEditor = canManageHealth();
  const departmentViewer = isDepartmentViewer();
  const organisationHidden = ['head', 'employee', 'supervisor', 'gm'].includes(state.user?.role);
  const payrollVisible = ['admin', 'hr', 'viewer'].includes(state.user?.role);
  for (const node of document.querySelectorAll(
    '[data-editor-only], [data-health-only], [data-non-nurse], [data-hod-hidden], [data-org-hidden], [data-no-payroll]'
  )) {
    node.hidden = (node.hasAttribute('data-editor-only') && !editable)
      || (node.hasAttribute('data-health-only') && !healthEditor)
      || (node.hasAttribute('data-non-nurse') && isNurse())
      || (node.hasAttribute('data-hod-hidden') && departmentViewer)
      || (node.hasAttribute('data-org-hidden') && organisationHidden)
      || (node.hasAttribute('data-no-payroll') && !payrollVisible);
  }
  $('dashboard-stats').hidden = isGm();
  $('summary-workforce-card').hidden = isEmployee() || isGm();
  $('new-leave-btn').hidden = !canApplyLeave();
  document.querySelector('.dashboard-summary-grid').classList.toggle(
    'single-summary', isNurse() || isEmployee() || isGm()
  );
  document.querySelector('.dashboard-summary-grid').classList.toggle('head-summary', departmentViewer);

  const allowed = rolePages(state.user?.role);
  for (const link of document.querySelectorAll('.side-link')) {
    if (link.id === 'users-nav-link' || link.id === 'admin-nav-link') {
      link.hidden = state.user?.role !== 'admin';
    } else {
      link.hidden = allowed ? !allowed.includes(link.getAttribute('href')) : false;
    }
  }
}

function setMenu(open) {
  userMenu.hidden = !open;
  userBtn.setAttribute('aria-expanded', String(open));
}

userBtn.addEventListener('click', () => setMenu(userMenu.hidden));

document.addEventListener('click', (event) => {
  if (!userMenu.hidden && !event.target.closest('.user-menu')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

/* ---------- Routing ---------- */

function currentPath() {
  return ROUTES[window.location.pathname] ? window.location.pathname : '/app';
}

async function renderRoute() {
  let path = currentPath();
  const route = ROUTES[path];

  if (state.user && state.user.role !== 'admin' && (path === '/users' || path === '/admin')) {
    history.replaceState({}, '', '/app');
    path = '/app';
  }
  const allowedPages = rolePages(state.user?.role);
  if (allowedPages && !allowedPages.includes(path)) {
    history.replaceState({}, '', '/app');
    path = '/app';
  }
  const view = ROUTES[path].view;

  document.title = `${ROUTES[path].title} · Docker HRMS`;
  $('page-title').textContent = ROUTES[path].title;

  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== view;
  }
  for (const link of document.querySelectorAll('.side-link')) {
    const active = link.getAttribute('href') === path;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  try {
    if (path === '/app') {
      await Promise.all([loadDashboard(), isGm() ? Promise.resolve() : ensureDepartments()]);
    } else if (path === '/employees') {
      await loadEmployeesView();
    } else if (path === '/health-records') {
      await loadHealthView();
    } else if (path === '/training') {
      await loadTrainingView();
    } else if (path === '/expatriates') {
      await loadExpatriatesView();
    } else if (path === '/reports') {
      initReportsView();
    } else if (path === '/reminders') {
      await loadRemindersView();
    } else if (path === '/departments') {
      await loadDepartmentsView();
    } else if (path === '/payroll') {
      await loadPayrollView();
    } else if (path === '/leave') {
      await loadLeaveView();
    } else if (path === '/users') {
      await loadUsersView();
    } else if (path === '/admin') {
      await loadAdminView();
    } else {
      await loadBankView();
    }
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load that page. Check the connection.');
  }
}

document.querySelectorAll('[data-route]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const path = link.getAttribute('href');
    if (path === currentPath()) return;
    history.pushState({}, '', path);
    renderRoute();
  });
});

window.addEventListener('popstate', () => {
  renderRoute();
});

/* ---------- Shared data ---------- */

function selectableDepartments() {
  return state.departments.filter((department) => !department.system);
}

async function ensureDepartments(force = false) {
  if (!departmentsLoaded || force) {
    const data = await api('/api/departments');
    state.departments = data.departments;
    departmentsLoaded = true;
    fillDepartmentSelect();
    fillEmployeeFilterDepartments();
  }
  return state.departments;
}

async function ensureEmployees(force = false) {
  if (!state.employees || !state.employeesLoaded || force) {
    const data = await api('/api/employees');
    state.employees = data.employees;
    state.employeesLoaded = true;
  }
  return state.employees;
}

function fillDepartmentSelect(selected) {
  const select = employeeForm.elements.department;
  const previous = selected !== undefined ? selected : select.value;
  select.replaceChildren();
  select.append(option('', 'Select department'));
  for (const department of state.departments) {
    select.append(option(department.name, department.name));
  }
  if (previous) {
    if ([...select.options].some((item) => item.value === previous)) {
      select.value = previous;
    } else {
      select.append(option(previous, previous));
      select.value = previous;
    }
  }
}

function departmentUnits(name) {
  const department = state.departments.find((row) => row.name === name);
  return department && Array.isArray(department.units) ? department.units : [];
}

function fillUnitSelect(selected) {
  const select = employeeForm.elements.unit;
  if (!select) return;
  const previous = selected !== undefined ? selected : select.value;
  const units = departmentUnits(employeeForm.elements.department.value);
  select.replaceChildren();
  select.append(option('', units.length ? 'No unit' : 'No units yet'));
  for (const unit of units) select.append(option(unit.name, unit.name));
  select.value = units.some((unit) => unit.name === previous) ? previous : '';
  select.disabled = !canEdit() || units.length === 0;
}

employeeForm.elements.department.addEventListener('change', () => fillUnitSelect(''));

function fillEmployeeFilterDepartments() {
  const select = $('employee-filter-department');
  const previous = select.value;
  select.replaceChildren();
  select.append(option('', 'All departments'));
  for (const department of state.departments) {
    select.append(option(department.name, department.name));
  }
  if (previous && [...select.options].some((item) => item.value === previous)) select.value = previous;
}

function fillDepartmentFilter(select, selectedId) {
  const previous = selectedId !== undefined ? String(selectedId) : select.value;
  select.replaceChildren();
  select.append(option('', 'All employees'));
  const employees = [...(state.employees || [])].sort((a, b) => a.fullName.localeCompare(b.fullName));
  for (const employee of employees) {
    select.append(option(String(employee.id), `${employee.fullName} (${employee.staffId})`));
  }
  if (previous && [...select.options].some((item) => item.value === previous)) select.value = previous;
}

function fillEmployeeChoose(select, { placeholder, selectedId, excludeIds } = {}) {
  const previous = selectedId !== undefined ? String(selectedId) : select.value;
  select.replaceChildren();
  if (placeholder) select.append(option('', placeholder));
  const employees = [...(state.employees || [])].sort((a, b) => a.fullName.localeCompare(b.fullName));
  for (const employee of employees) {
    if (excludeIds && excludeIds.has(employee.id)) continue;
    select.append(option(String(employee.id), `${employee.fullName} (${employee.staffId})`));
  }
  if (previous && [...select.options].some((item) => item.value === previous)) select.value = previous;
}

function fillHeadSelect(selectedId) {
  const select = departmentForm.elements.headEmployeeId;
  select.replaceChildren();
  select.append(option('', 'No head assigned'));
  const employees = [...(state.employees || [])].sort((a, b) => a.fullName.localeCompare(b.fullName));
  for (const employee of employees) {
    select.append(option(String(employee.id), `${employee.fullName} (${employee.staffId})`));
  }
  if (selectedId) select.value = String(selectedId);
}

/* ---------- Dashboard ---------- */

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = (state.user && (state.user.displayName || state.user.username)) || '';
  $('dash-greeting').textContent = name ? `${part}, ${name}` : part;
  $('dash-date').textContent = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function setAttention(id, count, sub) {
  $(`attention-${id}`).textContent = numberFormat.format(count);
  $(`attention-${id}-sub`).textContent = sub;
  $(`attention-${id}`).closest('.attention-card').classList.toggle('has-items', count > 0);
}

function renderAttention(attention = {}) {
  const birthdays = attention.birthdays || 0;
  const permits = (attention.expiringPermits || 0) + (attention.expiredDocuments || 0);
  const tasks = attention.openTasks || 0;
  const overdue = attention.overdueTasks || 0;

  setAttention('birthdays', birthdays, birthdays ? 'In the next 7 days' : 'None in the next 7 days');
  setAttention(
    'permits',
    permits,
    permits
      ? 'Expiring or expired documents'
      : attention.expatriates
        ? 'All permits in order'
        : 'No expatriates recorded',
  );
  setAttention(
    'tasks',
    tasks,
    overdue ? `${overdue} overdue · ${tasks} open` : tasks ? 'Open reminders' : 'No open tasks',
  );

  const total = birthdays + permits + tasks;
  $('dash-sub').textContent = total
    ? `${total} ${plural(total, 'item needs', 'items need')} attention today.`
    : 'Everything is up to date.';
}

function renderStats(stats) {
  $('stat-total-label').textContent = isEmployee() ? 'My record' : 'Total staff';
  $('stat-active-label').textContent = isEmployee() ? 'Employment status' : 'Active staff';
  $('stat-training-label').textContent = isEmployee() ? 'My training' : 'Training records';
  $('stat-longest-label').textContent = isEmployee() ? 'My service' : 'Longest service';

  $('stat-total').textContent = numberFormat.format(stats.total);
  $('stat-total-sub').textContent = isDepartmentViewer()
    ? `${stats.inactive} inactive · ${stats.departments} ${plural(stats.departments, 'department', 'departments')} in your scope`
    : `${stats.inactive} inactive · ${stats.departments} configured departments`;
  $('stat-active').textContent = isEmployee() ? (stats.active ? 'Active' : 'Inactive') : numberFormat.format(stats.active);
  $('stat-active-sub').textContent = isEmployee()
    ? 'Linked employee record'
    : stats.total
      ? `${Math.round((stats.active / stats.total) * 100)}% of ${isDepartmentViewer() ? 'department' : 'all'} staff`
      : 'No staff yet';
  $('stat-training').textContent = numberFormat.format(stats.training);
  $('stat-training-sub').textContent = isEmployee()
    ? 'records on your profile'
    : isDepartmentViewer() ? 'recorded in your department' : 'recorded org-wide';
  $('stat-longest').textContent = stats.longest ? `${stats.longest.years.toFixed(1)} yrs` : '—';
  $('stat-longest-sub').textContent = stats.longest
    ? `${stats.longest.name} · ${stats.longest.staffId}`
    : isEmployee() ? 'No active service record' : 'No active staff yet';
}

function statusPill(status) {
  return el('span', `pill ${status === 'Active' ? 'pill-active' : 'pill-inactive'}`, status);
}

function renderDashboardSummary(summary = {}) {
  const workforce = summary.workforce || {};
  const active = Number(workforce.active) || 0;
  const departments = Array.isArray(workforce.departments) ? workforce.departments : [];
  const workforceList = $('summary-workforce-list');
  workforceList.replaceChildren();
  for (const department of departments) {
    const count = Number(department.count) || 0;
    const row = el('div', 'department-row');
    const line = el('div', 'department-line');
    line.append(
      el('span', 'department-name', department.department || 'Unassigned'),
      el('strong', 'department-count', numberFormat.format(count)),
    );
    const track = el('div', 'department-track');
    track.setAttribute('aria-hidden', 'true');
    const fill = el('span', 'department-fill');
    fill.style.width = `${active ? (count / active) * 100 : 0}%`;
    track.append(fill);
    row.append(line, track);
    workforceList.append(row);
  }
  workforceList.hidden = active === 0;
  $('summary-workforce-empty').hidden = active !== 0;

  const expatriates = Number(workforce.expatriates) || 0;
  const contracts = Number(workforce.contractsEndingSoon) || 0;
  $('summary-workforce-foot').textContent = isDepartmentViewer()
    ? `${active} active ${plural(active, 'employee', 'employees')} in ${plural(departments.length, 'department', 'departments')} in your scope.`
    : expatriates || contracts
      ? `${expatriates} active ${plural(expatriates, 'expatriate', 'expatriates')} · ` +
        `${contracts} ${plural(contracts, 'contract', 'contracts')} ending in 60 days`
      : 'No active expatriates or contracts ending in 60 days.';

  const leave = summary.leave;
  if (leave) {
    const pending = Number(leave.pending) || 0;
    const approved = Number(leave.approvedYear) || 0;
    const onLeave = Number(leave.onLeaveToday) || 0;
    $('summary-leave-year').textContent = `Pending requests · approved in ${leave.year}`;
    $('summary-leave-pending').textContent = numberFormat.format(pending);
    $('summary-leave-head').textContent = numberFormat.format(Number(leave.pendingHead) || 0);
    $('summary-leave-hr').textContent = numberFormat.format(Number(leave.pendingHr) || 0);
    $('summary-leave-gm').textContent = numberFormat.format(Number(leave.pendingGm) || 0);
    $('summary-leave-approved').textContent = numberFormat.format(approved);
    $('summary-leave-content').hidden = pending === 0 && approved === 0 && onLeave === 0;
    $('summary-leave-empty').hidden = pending !== 0 || approved !== 0 || onLeave !== 0;
    $('summary-leave-today').textContent = isEmployee()
      ? onLeave ? 'You are on approved leave today.' : 'You are not on approved leave today.'
      : isGm()
        ? onLeave
          ? `${onLeave} ${plural(onLeave, 'HOD is', 'HODs are')} on approved leave today.`
          : 'No HODs are on approved leave today.'
        : onLeave
          ? `${onLeave} ${plural(onLeave, 'staff member is', 'staff members are')} on approved leave today.`
          : 'No staff are on approved leave today.';
  }

  const payroll = summary.payroll;
  if (payroll) {
    $('summary-payroll-period').textContent = payroll.label || payroll.period;
    $('summary-payroll-status').replaceChildren(payrollStatusPill(payroll.status));
    $('summary-payroll-net').textContent = money(payroll.totals.net);
    $('summary-payroll-staff').textContent = numberFormat.format(Number(payroll.totals.staffCount) || 0);
    $('summary-payroll-gross').textContent = money(payroll.totals.gross);
    $('summary-payroll-deductions').textContent = money(payroll.deductions);
    $('summary-payroll-content').hidden = false;
    $('summary-payroll-empty').hidden = true;
    const missingSalary = Number(payroll.activeWithoutSalary) || 0;
    const statusNote = payroll.status === 'Approved'
      ? `Approved ${formatStamp(payroll.approvedAt)} · Figures are locked.`
      : 'Draft figures can still change before approval.';
    $('summary-payroll-note').textContent = missingSalary
      ? `${statusNote} ${missingSalary} active ${plural(missingSalary, 'employee has', 'employees have')} no basic salary recorded.`
      : statusNote;
  } else if (['admin', 'hr', 'viewer'].includes(state.user?.role)) {
    $('summary-payroll-period').textContent = 'No payroll yet';
    $('summary-payroll-content').hidden = true;
    $('summary-payroll-empty').hidden = false;
    $('summary-payroll-note').textContent = 'Create a payroll run to see totals here.';
  }
}

async function loadDashboard() {
  const seq = ++state.seq;
  const data = await api('/api/dashboard');
  if (seq !== state.seq) return;
  renderGreeting();
  if (isDepartmentViewer()) {
    $('dash-sub').textContent = 'Your department overview.';
  } else if (isEmployee()) {
    $('dash-sub').textContent = 'Your employment and leave overview.';
  } else if (isGm()) {
    $('dash-sub').textContent = 'HOD leave awaiting final approval.';
  } else {
    renderAttention(data.attention);
  }
  renderStats(data.stats);
  renderDashboardSummary(data.summary);
}

function refreshDashboardIfVisible() {
  if (currentPath() !== '/app' || !state.user) return;
  loadDashboard().catch(() => {
    /* the next navigation will retry */
  });
}

for (const dialog of [employeeDialog, trainingDialog, healthDialog, reminderDialog]) {
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    refreshDashboardIfVisible();
  });
}

$('quick-training').addEventListener('click', () => openTrainingDialog());
$('quick-health').addEventListener('click', openHealthDialog);
$('quick-task').addEventListener('click', () => openReminderDialog());

/* ---------- Employee directory ---------- */

function employeeQuery() {
  const params = new URLSearchParams();
  const q = $('employee-filter-q').value.trim();
  const department = $('employee-filter-department').value;
  const status = $('employee-filter-status').value;
  const type = $('employee-filter-type').value;
  if (q) params.set('q', q);
  if (department) params.set('department', department);
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function renderEmployees() {
  const body = $('employees-body');
  body.replaceChildren();
  const rows = state.employeeList;
  const active = rows.filter((row) => row.status === 'Active').length;
  const filtered = employeeQuery() !== '';
  $('employees-sub').textContent = rows.length
    ? `${rows.length} ${plural(rows.length, 'employee', 'employees')} shown · ${active} active`
    : filtered
      ? 'No employees match the current filters.'
      : 'No employees yet.';

  $('employees-table').hidden = rows.length === 0;
  $('employees-empty').hidden = rows.length > 0;
  $('employees-empty-text').textContent = filtered
    ? 'No employees match those filters.'
    : 'No employees have been added yet.';
  const emptyButton = $('employees-empty-reset');
  emptyButton.textContent = filtered ? 'Clear filters' : 'Add employee';
  emptyButton.dataset.mode = filtered ? 'reset' : 'add';
  emptyButton.hidden = !filtered && !canEdit();

  for (const employee of rows) {
    const row = document.createElement('tr');

    const employeeCell = el('td');
    const wrap = el('div', 'employee-cell');
    if (employee.hasPhoto) {
      const img = document.createElement('img');
      img.className = 'avatar-sm';
      img.src = `/api/employees/${employee.id}/photo`;
      img.alt = '';
      wrap.append(img);
    } else {
      wrap.append(el('span', 'avatar-sm', initials(employee.fullName)));
    }
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', employee.fullName), el('span', 'cell-sub', employee.staffId));
    wrap.append(stack);
    employeeCell.append(wrap);
    row.append(employeeCell);

    row.append(el('td', 'position', employee.position));
    const departmentCell = el('td', 'department');
    if (employee.unit) {
      const departmentStack = el('div', 'cell-stack');
      departmentStack.append(el('span', null, employee.department), el('span', 'cell-sub', employee.unit));
      departmentCell.append(departmentStack);
    } else {
      departmentCell.textContent = employee.department;
    }
    row.append(departmentCell);
    row.append(el('td', null, employee.employmentType || '—'));
    row.append(el('td', 'mono', employee.phone || '—'));

    const statusCell = el('td');
    statusCell.append(statusPill(employee.status));
    row.append(statusCell);

    const actions = el('td', 'actions-cell');
    const open = el('button', 'btn-link', 'Open');
    open.type = 'button';
    open.addEventListener('click', () => openEmployeeEditor(employee.id));
    actions.append(open);
    row.append(actions);

    body.appendChild(row);
  }
}

async function loadEmployeesView() {
  const seq = ++state.empSeq;
  await ensureDepartments();
  const data = await api(`/api/employees${employeeQuery()}`);
  if (seq !== state.empSeq) return;
  state.employeeList = data.employees;
  renderEmployees();
}

const refreshEmployeeList = debounce(() => {
  loadEmployeesView().catch((err) => {
    if (err.status === 401) return;
    toast('Could not update the employee list. Check the connection.');
  });
}, 220);

$('employee-filter-q').addEventListener('input', refreshEmployeeList);
for (const id of ['employee-filter-department', 'employee-filter-status', 'employee-filter-type']) {
  $(id).addEventListener('change', refreshEmployeeList);
}

function resetEmployeeFilters() {
  $('employee-filter-q').value = '';
  $('employee-filter-department').value = '';
  $('employee-filter-status').value = '';
  $('employee-filter-type').value = '';
  loadEmployeesView().catch(() => toast('Could not update the employee list. Check the connection.'));
}

$('employee-filter-reset').addEventListener('click', resetEmployeeFilters);
$('employees-empty-reset').addEventListener('click', () => {
  if ($('employees-empty-reset').dataset.mode === 'add') {
    openEmployeeEditor();
    return;
  }
  resetEmployeeFilters();
});
$('employees-add-btn').addEventListener('click', () => openEmployeeEditor());
$('add-employee-btn').addEventListener('click', () => openEmployeeEditor());

/* ---------- Employee editor ---------- */

const PHOTO_TAB = 'files';
const FIELD_TABS = {
  staffId: 'personal', fullName: 'personal', dob: 'personal', sex: 'personal', nationality: 'personal',
  maritalStatus: 'personal', phone: 'personal', email: 'personal', nationalIdType: 'personal',
  nationalIdNumber: 'personal', residentialAddress: 'personal',
  position: 'employment', department: 'employment', employmentType: 'employment', joinedOn: 'employment',
  leavingOn: 'employment', contractEnd: 'employment', probationEnd: 'employment', status: 'employment',
  isExpatriate: 'employment',
  leaveEntitlement: 'employment', leaveOpening: 'employment',
  basicSalary: 'employment', housingAllowance: 'employment', transportAllowance: 'employment',
  otherAllowance: 'employment',
  fatherName: 'family', fatherContact: 'family', motherName: 'family', motherContact: 'family',
  spouseName: 'family', spouseContact: 'family', nextOfKinName: 'family', nextOfKinRelationship: 'family',
  nextOfKinContact: 'family', emergencyName: 'family', emergencyRelationship: 'family',
  emergencyContact: 'family',
  bankName: 'banking', bankBranch: 'banking', accountName: 'banking', accountNumber: 'banking',
  ssnitNumber: 'banking', tinNumber: 'banking',
  bloodGroup: 'health', allergies: 'health', medicalConditions: 'health',
};

const EMPLOYEE_FIELDS = [
  'staffId', 'fullName', 'dob', 'sex', 'nationality', 'maritalStatus', 'phone', 'email',
  'nationalIdType', 'nationalIdNumber', 'residentialAddress',
  'position', 'department', 'employmentType', 'joinedOn', 'leavingOn', 'contractEnd', 'probationEnd', 'status',
  'leaveEntitlement', 'leaveOpening',
  'basicSalary', 'housingAllowance', 'transportAllowance', 'otherAllowance',
  'fatherName', 'fatherContact', 'motherName', 'motherContact', 'spouseName', 'spouseContact',
  'nextOfKinName', 'nextOfKinRelationship', 'nextOfKinContact',
  'emergencyName', 'emergencyRelationship', 'emergencyContact',
  'bankName', 'bankBranch', 'accountName', 'accountNumber', 'ssnitNumber', 'tinNumber',
  'bloodGroup', 'allergies', 'medicalConditions',
];

const ROW_DEFS = {
  dependants: {
    container: 'dependants-rows',
    label: 'dependant',
    fields: [
      { key: 'name', label: 'Name', maxlength: 80, placeholder: 'Full name' },
      { key: 'dob', label: 'Date of birth', type: 'date' },
    ],
  },
  education: {
    container: 'education-rows',
    label: 'education entry',
    fields: [
      { key: 'institution', label: 'Institution', maxlength: 100, placeholder: 'School or university' },
      { key: 'qualification', label: 'Qualification', maxlength: 100, placeholder: 'e.g. BSc Accounting' },
      { key: 'year', label: 'Year', type: 'number', min: 1950, max: new Date().getFullYear() + 5, placeholder: '2020' },
    ],
  },
  experience: {
    container: 'experience-rows',
    label: 'work experience',
    fields: [
      { key: 'employer', label: 'Employer', maxlength: 100, placeholder: 'Company name' },
      { key: 'jobTitle', label: 'Job title', maxlength: 80, placeholder: 'Role held' },
      { key: 'startYear', label: 'Start year', type: 'number', min: 1950, max: new Date().getFullYear() + 5, placeholder: '2016' },
      { key: 'endYear', label: 'End year', type: 'number', min: 1950, max: new Date().getFullYear() + 5, placeholder: '2020' },
    ],
  },
  referees: {
    container: 'referee-rows',
    label: 'referee',
    fields: [
      { key: 'name', label: 'Name', maxlength: 80, placeholder: 'Referee name' },
      { key: 'relationship', label: 'Relationship', maxlength: 60, placeholder: 'e.g. Former supervisor' },
      { key: 'contact', label: 'Contact', maxlength: 60, placeholder: 'Phone or email' },
    ],
  },
};

function addRepeatRow(type, values = {}) {
  const def = ROW_DEFS[type];
  const item = el('div', 'row-item');
  for (const field of def.fields) {
    const label = el('label', 'field');
    label.append(el('span', null, field.label));
    const input = document.createElement('input');
    if (field.type) input.type = field.type;
    if (field.maxlength) input.maxLength = field.maxlength;
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.placeholder) input.placeholder = field.placeholder;
    input.autocomplete = 'off';
    input.dataset.key = field.key;
    const value = values[field.key];
    input.value = value === null || value === undefined ? '' : String(value);
    label.append(input);
    item.append(label);
  }
  const remove = el('button', 'row-remove', 'Remove');
  remove.type = 'button';
  remove.addEventListener('click', () => item.remove());
  item.append(remove);
  $(def.container).append(item);
}

function clearRepeatRows() {
  for (const def of Object.values(ROW_DEFS)) $(def.container).replaceChildren();
}

function readRepeatRows(type) {
  const def = ROW_DEFS[type];
  return [...$(def.container).querySelectorAll('.row-item')]
    .map((item) => {
      const row = {};
      for (const field of def.fields) {
        const input = item.querySelector(`[data-key="${field.key}"]`);
        row[field.key] = input ? input.value.trim() : '';
      }
      return row;
    })
    .filter((row) => Object.values(row).some(Boolean));
}

const ADD_ROW_HANDLERS = {
  'add-dependant': 'dependants',
  'add-education': 'education',
  'add-experience': 'experience',
  'add-referee': 'referees',
};
for (const [id, type] of Object.entries(ADD_ROW_HANDLERS)) {
  $(id).addEventListener('click', () => addRepeatRow(type));
}

function showEmployeeTab(name) {
  if (isDepartmentViewer() && !['personal', 'employment'].includes(name)) name = 'personal';
  for (const button of employeeDialog.querySelectorAll('.tab-btn')) {
    const active = button.dataset.tab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  }
  for (const pane of employeeDialog.querySelectorAll('.tab-pane')) {
    pane.hidden = pane.dataset.pane !== name;
  }
  employeeDialog.scrollTop = 0;
}

employeeDialog.querySelectorAll('.tab-btn').forEach((button) => {
  button.addEventListener('click', () => showEmployeeTab(button.dataset.tab));
});

function updateAutoFields() {
  const dob = employeeForm.elements.dob.value;
  const age = ageFromDate(dob);
  $('age-display').textContent = age === null ? 'Age —' : `Age ${age} yrs`;

  const joined = employeeForm.elements.joinedOn.value;
  const years = serviceYears(joined);
  $('service-display').textContent = years === null ? 'Service —' : `${years.toFixed(1)} yrs of service`;

  const profile = state.employeeProfile;
  const taken = profile ? Number(profile.leaveTaken) || 0 : 0;
  const pending = profile ? Number(profile.leavePending) || 0 : 0;
  const opening = Number(employeeForm.elements.leaveOpening.value || 0) || 0;
  const entitlementRaw = employeeForm.elements.leaveEntitlement.value;
  const entitlement = Number(entitlementRaw);

  $('leave-taken-display').textContent = profile
    ? `${taken} ${plural(taken, 'day', 'days')}`
    : 'Saved after first request';
  $('leave-pending-display').textContent = profile
    ? `${pending} ${plural(pending, 'day', 'days')}`
    : '—';
  if (entitlementRaw === '' || !Number.isFinite(entitlement)) {
    $('balance-display').textContent = 'Balance —';
  } else {
    const balance = Math.round((entitlement - opening - taken) * 10) / 10;
    $('balance-display').textContent = `Balance ${balance} ${plural(balance, 'day', 'days')}`;
  }
  $('current-leave-display').textContent = profile && profile.currentLeave
    ? `${profile.currentLeave.type} · ${formatDate(profile.currentLeave.startOn)} to ${formatDate(profile.currentLeave.endOn)}`
    : 'Not on leave';

  const amount = (name) => {
    const raw = employeeForm.elements[name].value;
    return raw === '' ? 0 : Number(raw) || 0;
  };
  const pay = payrollFigures({
    basicSalary: amount('basicSalary'),
    housingAllowance: amount('housingAllowance'),
    transportAllowance: amount('transportAllowance'),
    otherAllowance: amount('otherAllowance'),
    otherDeductions: 0,
  });
  $('gross-display').textContent = pay.gross
    ? `Gross ${money(pay.gross)} · Net ${money(pay.net)}`
    : 'Gross —';
}

function renderPhoto(url) {
  const img = $('employee-photo');
  const fallback = $('employee-photo-fallback');
  $('employee-photo-remove').hidden = !url;
  if (url) {
    img.src = url;
    img.hidden = false;
    fallback.hidden = true;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
    fallback.hidden = false;
  }
}

function fillEmployeeForm(profile) {
  for (const name of EMPLOYEE_FIELDS) {
    const input = employeeForm.elements[name];
    if (!input) continue;
    const value = profile ? profile[name] : '';
    input.value = value === null || value === undefined ? '' : String(value);
  }
  employeeForm.elements.isExpatriate.checked = Boolean(profile && profile.isExpatriate);

  if (!profile) {
    employeeForm.elements.status.value = 'Active';
    employeeForm.elements.joinedOn.value = todayISO();
    employeeForm.elements.leaveEntitlement.value = '25';
    employeeForm.elements.leaveOpening.value = '0';
    addRepeatRow('education');
    addRepeatRow('experience');
  } else {
    for (const row of profile.dependants) addRepeatRow('dependants', row);
    for (const row of profile.education) addRepeatRow('education', row);
    for (const row of profile.experience) addRepeatRow('experience', row);
    for (const row of profile.referees) addRepeatRow('referees', row);
  }
}

async function openEmployeeEditor(employeeId = null) {
  if (!canEdit() && !employeeId) return;
  try {
    await ensureDepartments();
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load departments. Check the connection.');
    return;
  }

  if (!employeeId && !selectableDepartments().length) {
    if (!canEdit()) return;
    toast('Add a department before adding staff.');
    openDepartmentDialog();
    return;
  }

  let profile = null;
  let nextStaffId = '';
  if (employeeId) {
    try {
      const data = await api(`/api/employees/${employeeId}`);
      profile = data.employee;
    } catch (err) {
      if (err.status === 401) return;
      toast(err.message);
      return;
    }
  } else {
    try {
      const data = await api('/api/employees/next-id');
      nextStaffId = data.staffId;
    } catch (err) {
      if (err.status === 401) return;
    }
  }

  state.editingEmployeeId = employeeId;
  state.employeeProfile = profile;
  state.pendingPhoto = null;
  state.removePhoto = false;

  employeeForm.reset();
  hideFormError(employeeError);
  hideDocumentError();
  clearInvalid(employeeForm);
  fillDepartmentSelect(profile ? profile.department : '');
  clearRepeatRows();
  fillEmployeeForm(profile);
  fillUnitSelect(profile ? profile.unit || '' : '');
  if (!employeeId) employeeForm.elements.staffId.value = nextStaffId;
  showEmployeeTab('personal');

  $('employee-dialog-title').textContent = employeeId
    ? (canEdit() ? 'Edit employee' : 'Employee details')
    : 'Add employee';
  $('employee-dialog-sub').textContent = isDepartmentViewer()
    ? 'Read-only department staff record.'
    : isEmployee()
      ? 'Your linked employee record.'
      : profile
        ? `${profile.fullName} · ${profile.staffId}`
        : 'Create a full personnel record.';
  employeeSubmit.textContent = employeeId ? 'Save changes' : 'Add employee';

  $('employee-photo-file').value = '';
  $('document-file').value = '';
  $('document-title').value = '';
  renderPhoto(profile && profile.photoUrl ? `${profile.photoUrl}?v=${Date.now()}` : null);
  renderProfileDocuments(profile ? profile.documents : []);
  updateAutoFields();
  setEmployeeFormReadOnly(!canEdit());

  employeeDialog.showModal();
  if (!employeeId) setTimeout(() => employeeForm.elements.fullName.focus(), 30);
}

function setEmployeeFormReadOnly(readOnly) {
  for (const field of employeeForm.querySelectorAll('input, select, textarea')) {
    field.disabled = readOnly;
  }
  for (const id of ['add-dependant', 'add-education', 'add-experience', 'add-referee', 'employee-photo-remove', 'document-upload-box']) {
    $(id).hidden = readOnly;
  }
  for (const node of employeeForm.querySelectorAll('.row-remove')) {
    node.hidden = readOnly;
  }
  $('employee-photo-file').closest('.field').hidden = readOnly;
  employeeSubmit.hidden = readOnly;
  const cancel = employeeForm.querySelector('.modal-actions [data-close]');
  cancel.textContent = readOnly ? 'Close' : 'Cancel';
}

employeeDialog.addEventListener('close', () => {
  if (employeeDialog.open) return;
  state.editingEmployeeId = null;
  state.employeeProfile = null;
  state.pendingPhoto = null;
  state.removePhoto = false;
});

employeeForm.addEventListener('input', (event) => {
  if (event.target.matches('input, select, textarea')) markInvalid(event.target, false);
  if (
    ['dob', 'joinedOn', 'leaveEntitlement', 'leaveOpening', 'basicSalary', 'housingAllowance',
      'transportAllowance', 'otherAllowance'].includes(event.target.name)
  ) {
    updateAutoFields();
  }
});

function validatePhotoFile(file) {
  if (!file) return 'Choose an image first.';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Choose a PNG, JPG or WebP image.';
  if (file.size > MAX_PHOTO_BYTES) return 'The photo must be 2 MB or smaller.';
  return null;
}

$('employee-photo-file').addEventListener('change', async () => {
  const input = $('employee-photo-file');
  const file = input.files[0];
  if (!file) return;
  const problem = validatePhotoFile(file);
  if (problem) {
    toast(problem);
    input.value = '';
    return;
  }
  try {
    const dataUrl = await readFileAsDataURL(file);
    state.pendingPhoto = dataUrl;
    state.removePhoto = false;
    renderPhoto(dataUrl);
  } catch {
    toast('Could not read that image.');
  }
});

$('employee-photo-remove').addEventListener('click', () => {
  state.pendingPhoto = null;
  state.removePhoto = true;
  $('employee-photo-file').value = '';
  renderPhoto(null);
});

function collectEmployeePayload() {
  const value = (name) => String(employeeForm.elements[name]?.value ?? '').trim();
  const number = (name) => {
    const raw = value(name);
    return raw === '' ? null : Number(raw);
  };
  const payload = {
    staffId: value('staffId'),
    fullName: value('fullName'),
    dob: value('dob'),
    sex: value('sex'),
    nationality: value('nationality'),
    maritalStatus: value('maritalStatus'),
    phone: value('phone'),
    email: value('email'),
    nationalIdType: value('nationalIdType'),
    nationalIdNumber: value('nationalIdNumber'),
    residentialAddress: value('residentialAddress'),
    position: value('position'),
    department: value('department'),
    unit: value('unit'),
    employmentType: value('employmentType'),
    joinedOn: value('joinedOn'),
    leavingOn: value('leavingOn'),
    contractEnd: value('contractEnd'),
    probationEnd: value('probationEnd'),
    status: employeeForm.elements.status.value,
    isExpatriate: employeeForm.elements.isExpatriate.checked,
    leaveEntitlement: number('leaveEntitlement'),
    leaveOpening: number('leaveOpening'),
    basicSalary: number('basicSalary'),
    housingAllowance: number('housingAllowance'),
    transportAllowance: number('transportAllowance'),
    otherAllowance: number('otherAllowance'),
    fatherName: value('fatherName'),
    fatherContact: value('fatherContact'),
    motherName: value('motherName'),
    motherContact: value('motherContact'),
    spouseName: value('spouseName'),
    spouseContact: value('spouseContact'),
    nextOfKinName: value('nextOfKinName'),
    nextOfKinRelationship: value('nextOfKinRelationship'),
    nextOfKinContact: value('nextOfKinContact'),
    emergencyName: value('emergencyName'),
    emergencyRelationship: value('emergencyRelationship'),
    emergencyContact: value('emergencyContact'),
    bankName: value('bankName'),
    bankBranch: value('bankBranch'),
    accountName: value('accountName'),
    accountNumber: value('accountNumber').replace(/\s+/g, ''),
    ssnitNumber: value('ssnitNumber').toUpperCase(),
    tinNumber: value('tinNumber'),
    bloodGroup: value('bloodGroup'),
    allergies: value('allergies'),
    medicalConditions: value('medicalConditions'),
    dependants: readRepeatRows('dependants'),
    education: readRepeatRows('education'),
    experience: readRepeatRows('experience'),
    referees: readRepeatRows('referees'),
  };
  if (state.pendingPhoto) payload.photoDataUrl = state.pendingPhoto;
  if (state.removePhoto) payload.removePhoto = true;
  return payload;
}

function employeeFieldError(name, message) {
  const tab = FIELD_TABS[name] || 'personal';
  showEmployeeTab(tab);
  const field = employeeForm.elements[name];
  markInvalid(field, true);
  if (field) field.focus();
  showFormError(employeeError, message);
}

function validateEmployeePayload(payload) {
  const required = [
    ['fullName', 'Enter the employee’s full name.'],
    ['position', 'Enter a job title.'],
    ['department', 'Choose a department.'],
    ['joinedOn', 'Enter the joining date.'],
  ];
  for (const [name, message] of required) {
    if (!payload[name]) return { name, message };
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return { name: 'email', message: 'Enter a valid email address.' };
  }
  if (payload.accountNumber && !/^\d{6,20}$/.test(payload.accountNumber)) {
    return { name: 'accountNumber', message: 'Account number must be 6 to 20 digits.' };
  }
  if (payload.ssnitNumber && !/^[A-Z]\d{10}$/.test(payload.ssnitNumber)) {
    return { name: 'ssnitNumber', message: 'SSNIT number must be a letter followed by 10 digits, for example C1234567890.' };
  }
  if (payload.dob && payload.dob > todayISO()) {
    return { name: 'dob', message: 'Date of birth cannot be in the future.' };
  }
  if (payload.joinedOn && payload.contractEnd && payload.contractEnd < payload.joinedOn) {
    return { name: 'contractEnd', message: 'Contract end date must be on or after the joining date.' };
  }
  if (payload.joinedOn && payload.leavingOn && payload.leavingOn < payload.joinedOn) {
    return { name: 'leavingOn', message: 'Leaving date must be on or after the joining date.' };
  }
  for (const row of payload.education) {
    if (row.year && !Number.isInteger(Number(row.year))) {
      return { tab: 'education', message: 'Enter a valid graduation year for each education entry.' };
    }
  }
  for (const row of payload.experience) {
    const start = Number(row.startYear);
    const end = Number(row.endYear);
    if (row.startYear && row.endYear && end < start) {
      return { tab: 'education', message: `The end year for ${row.employer} must be on or after the start year.` };
    }
  }
  return null;
}

employeeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(employeeError);

  const editing = state.editingEmployeeId !== null;
  const payload = collectEmployeePayload();
  const problem = validateEmployeePayload(payload);
  if (problem) {
    if (problem.tab) {
      showEmployeeTab(problem.tab);
      showFormError(employeeError, problem.message);
    } else {
      employeeFieldError(problem.name, problem.message);
    }
    return;
  }

  const idleLabel = editing ? 'Save changes' : 'Add employee';
  setBusy(employeeSubmit, true, idleLabel, 'Saving…');
  try {
    const data = editing
      ? await api(`/api/employees/${state.editingEmployeeId}`, jsonRequest('PUT', payload))
      : await api('/api/employees', jsonRequest('POST', payload));
    employeeDialog.close();
    state.employees = null;
    state.employeesLoaded = false;
    departmentsLoaded = false;
    toast(editing ? 'Employee record updated.' : 'Employee added.');

    if (currentPath() === '/employees') {
      await loadEmployeesView();
    } else if (currentPath() === '/app') {
      await loadDashboard();
    } else if (currentPath() === '/reports' && state.reportProfile) {
      await loadReport(state.reportProfile.id);
    }
  } catch (err) {
    if (err.status === 401) return;
    showFormError(employeeError, err.message);
    employeeError.scrollIntoView({ block: 'nearest' });
  } finally {
    setBusy(employeeSubmit, false, idleLabel, 'Saving…');
  }
});

/* ---------- Employee documents and photo uploads ---------- */

function showDocumentError(message) {
  const box = $('document-error');
  box.className = 'form-error';
  box.textContent = message;
  box.hidden = false;
}

function hideDocumentError() {
  const box = $('document-error');
  box.textContent = '';
  box.hidden = true;
}

function renderProfileDocuments(documents) {
  const editing = state.editingEmployeeId !== null;
  $('document-upload-box').hidden = !editing;
  $('document-hint').hidden = editing;
  hideDocumentError();

  const list = $('document-list');
  list.replaceChildren();

  if (!editing) return;
  if (!documents.length) {
    list.append(el('p', 'hint', 'No documents attached to this employee yet.'));
    return;
  }

  for (const document of documents) {
    const item = el('div', 'doc-item');
    const meta = el('div', 'doc-meta');
    meta.append(el('strong', null, document.title));
    meta.append(el('span', null, `${document.filename} · ${formatBytes(document.size)} · ${formatStamp(document.uploadedAt)}`));
    item.append(meta);

    const open = el('a', 'btn-link', 'Download');
    open.href = document.downloadUrl;
    open.download = document.filename;
    item.append(open);

    const remove = el('button', 'btn-link danger', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      openConfirm({
        title: 'Remove document?',
        message: `“${document.title}” will be removed from this employee’s file.`,
        actionLabel: 'Remove document',
        action: async () => {
          await api(`/api/documents/${document.id}`, { method: 'DELETE' });
          toast('Document removed.');
          await refreshEmployeeProfile();
        },
      });
    });
    item.append(remove);
    if (!canEdit()) remove.hidden = true;
    list.append(item);
  }
}

async function refreshEmployeeProfile() {
  if (state.editingEmployeeId === null) return;
  const data = await api(`/api/employees/${state.editingEmployeeId}`);
  state.employeeProfile = data.employee;
  renderProfileDocuments(data.employee.documents);
}

function validateDocFile(file) {
  if (!file) return 'Choose a file to upload.';
  if (!ALLOWED_DOC_TYPES.has(file.type)) return 'Upload a picture, PDF, Word document or text file.';
  if (file.size > MAX_DOC_BYTES) return 'That file is larger than 6 MB.';
  return null;
}

$('document-upload-btn').addEventListener('click', async () => {
  hideDocumentError();
  if (state.editingEmployeeId === null) return;

  const fileInput = $('document-file');
  const file = fileInput.files[0];
  const problem = validateDocFile(file);
  if (problem) {
    showDocumentError(problem);
    return;
  }

  const button = $('document-upload-btn');
  setBusy(button, true, 'Upload document', 'Uploading…');
  try {
    const dataUrl = await readFileAsDataURL(file);
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error('Could not read that file.');
    await api(`/api/employees/${state.editingEmployeeId}/documents`, jsonRequest('POST', {
      title: $('document-title').value.trim(),
      filename: file.name,
      mime: match[1],
      data: match[2],
    }));
    fileInput.value = '';
    $('document-title').value = '';
    toast('Document uploaded.');
    await refreshEmployeeProfile();
  } catch (err) {
    if (err.status === 401) return;
    showDocumentError(err.message);
  } finally {
    setBusy(button, false, 'Upload document', 'Uploading…');
  }
});

/* ---------- Training records ---------- */

function renderTraining() {
  const rows = state.trainingRows;
  const certificates = rows.filter((row) => row.certificateIssued).length;
  $('training-sub').textContent = rows.length
    ? `${rows.length} ${plural(rows.length, 'record', 'records')} · ${certificates} ${plural(certificates, 'certificate', 'certificates')} issued`
    : 'No training records match the current filters.';

  const body = $('training-body');
  body.replaceChildren();
  $('training-table').hidden = rows.length === 0;
  $('training-empty').hidden = rows.length > 0;

  for (const training of rows) {
    const row = document.createElement('tr');

    const employeeCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', training.employeeName), el('span', 'cell-sub', training.staffId));
    employeeCell.append(stack);
    row.append(employeeCell);

    row.append(el('td', 'name', training.title));
    row.append(el('td', null, formatDate(training.completedOn)));
    row.append(el('td', null, training.duration || '—'));
    row.append(el('td', null, training.facilitator || '—'));
    row.append(el('td', null, training.venue || '—'));
    row.append(el('td', 'num', training.score === null ? '—' : String(training.score)));

    const certificateCell = el('td');
    certificateCell.append(el('span', `status-tag ${training.certificateIssued ? 'status-ok' : 'status-none'}`, training.certificateIssued ? 'Yes' : 'No'));
    row.append(certificateCell);

    row.append(el('td', 'position', training.remarks || '—'));

    const actions = el('td', 'actions-cell');
    const edit = el('button', 'btn-link', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => openTrainingDialog(training));
    const remove = el('button', 'btn-link danger', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      openConfirm({
        title: 'Remove training record?',
        message: `${training.title} for ${training.employeeName} will be deleted.`,
        actionLabel: 'Remove record',
        action: async () => {
          await api(`/api/training/${training.id}`, { method: 'DELETE' });
          toast('Training record removed.');
          await loadTrainingView();
        },
      });
    });
    actions.append(edit, remove);
    if (!canEdit()) actions.replaceChildren(el('span', 'muted', '—'));
    row.append(actions);
    body.append(row);
  }
}

async function loadTrainingView() {
  const seq = ++state.trainingSeq;
  await ensureEmployees();
  fillDepartmentFilter($('training-filter-employee'));
  const params = new URLSearchParams();
  const q = $('training-filter-q').value.trim();
  const employeeId = $('training-filter-employee').value;
  if (q) params.set('q', q);
  if (employeeId) params.set('employeeId', employeeId);
  const query = params.toString();
  const data = await api(`/api/training${query ? `?${query}` : ''}`);
  if (seq !== state.trainingSeq) return;
  state.trainingRows = data.training;
  renderTraining();
}

const refreshTrainingList = debounce(() => {
  loadTrainingView().catch((err) => {
    if (err.status === 401) return;
    toast('Could not update training records. Check the connection.');
  });
}, 220);

$('training-filter-q').addEventListener('input', refreshTrainingList);
$('training-filter-employee').addEventListener('change', refreshTrainingList);
$('training-filter-reset').addEventListener('click', () => {
  $('training-filter-q').value = '';
  $('training-filter-employee').value = '';
  loadTrainingView().catch(() => toast('Could not update training records. Check the connection.'));
});

async function openTrainingDialog(training = null) {
  try {
    await ensureEmployees(true);
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load employees. Check the connection.');
    return;
  }
  if (!state.employees.length) {
    toast('Add an employee before recording training.');
    return;
  }

  const filteredEmployee = $('training-filter-employee').value;
  state.editingTrainingId = training ? training.id : null;
  trainingForm.reset();
  hideFormError(trainingError);
  clearInvalid(trainingForm);
  fillEmployeeChoose(trainingForm.elements.employeeId, {
    placeholder: 'Select employee',
    selectedId: training ? training.employeeId : filteredEmployee || undefined,
  });
  $('training-dialog-title').textContent = training ? 'Edit training' : 'Add training';
  $('training-dialog-sub').textContent = training
    ? `${training.employeeName} · ${training.title}`
    : 'Record a training session for an employee.';
  trainingSubmit.textContent = training ? 'Save changes' : 'Add training';

  if (training) {
    trainingForm.elements.title.value = training.title;
    trainingForm.elements.completedOn.value = training.completedOn;
    trainingForm.elements.duration.value = training.duration;
    trainingForm.elements.facilitator.value = training.facilitator;
    trainingForm.elements.venue.value = training.venue;
    trainingForm.elements.score.value = training.score === null ? '' : String(training.score);
    trainingForm.elements.certificateIssued.value = training.certificateIssued ? 'yes' : 'no';
    trainingForm.elements.remarks.value = training.remarks;
  } else {
    trainingForm.elements.completedOn.value = todayISO();
  }

  trainingDialog.showModal();
}

$('add-training-btn').addEventListener('click', () => openTrainingDialog());

trainingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(trainingError);

  const values = Object.fromEntries(new FormData(trainingForm));
  const payload = {
    employeeId: Number(values.employeeId),
    title: String(values.title || '').trim(),
    completedOn: String(values.completedOn || ''),
    duration: String(values.duration || '').trim(),
    facilitator: String(values.facilitator || '').trim(),
    venue: String(values.venue || '').trim(),
    score: String(values.score || '').trim(),
    certificateIssued: values.certificateIssued === 'yes',
    remarks: String(values.remarks || '').trim(),
  };

  if (!payload.employeeId) {
    markInvalid(trainingForm.elements.employeeId, true);
    showFormError(trainingError, 'Choose an employee.');
    return;
  }
  if (!payload.title) {
    markInvalid(trainingForm.elements.title, true);
    showFormError(trainingError, 'Enter a training title.');
    trainingForm.elements.title.focus();
    return;
  }
  if (!payload.completedOn) {
    markInvalid(trainingForm.elements.completedOn, true);
    showFormError(trainingError, 'Choose the date of training.');
    return;
  }
  if (payload.score !== '') {
    const score = Number(payload.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      markInvalid(trainingForm.elements.score, true);
      showFormError(trainingError, 'Score must be between 0 and 100.');
      return;
    }
  }

  const editing = state.editingTrainingId !== null;
  const idleLabel = editing ? 'Save changes' : 'Add training';
  setBusy(trainingSubmit, true, idleLabel, 'Saving…');
  try {
    if (editing) {
      await api(`/api/training/${state.editingTrainingId}`, jsonRequest('PUT', payload));
      toast('Training record updated.');
    } else {
      await api('/api/training', jsonRequest('POST', payload));
      toast('Training recorded.');
    }
    trainingDialog.close();
    state.editingTrainingId = null;
    await loadTrainingView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(trainingError, err.message);
  } finally {
    setBusy(trainingSubmit, false, idleLabel, 'Saving…');
  }
});

trainingDialog.addEventListener('close', () => {
  if (trainingDialog.open) return;
  state.editingTrainingId = null;
});

/* ---------- Health records ---------- */

function renderHealth() {
  const rows = state.healthRows;
  const attachments = rows.filter((row) => row.hasFile).length;
  $('health-sub').textContent = rows.length
    ? `${rows.length} ${plural(rows.length, 'record', 'records')} · ${attachments} with attachments`
    : 'No health records match the current filters.';

  const body = $('health-body');
  body.replaceChildren();
  $('health-table').hidden = rows.length === 0;
  $('health-empty').hidden = rows.length > 0;

  for (const record of rows) {
    const row = document.createElement('tr');

    const employeeCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', record.employeeName), el('span', 'cell-sub', record.staffId));
    employeeCell.append(stack);
    row.append(employeeCell);

    row.append(el('td', 'name', record.title));
    row.append(el('td', null, formatDate(record.recordDate)));
    row.append(el('td', 'position', record.notes || '—'));

    const fileCell = el('td');
    if (record.hasFile) {
      const open = el('a', 'btn-link', 'Open file');
      open.href = record.fileUrl;
      open.target = '_blank';
      open.rel = 'noopener';
      fileCell.append(open);
      const meta = el('div', 'cell-sub', `${record.filename} · ${formatBytes(record.size)}`);
      fileCell.append(meta);
    } else {
      fileCell.append(el('span', 'muted', 'None'));
    }
    row.append(fileCell);

    const actions = el('td', 'actions-cell');
    const remove = el('button', 'btn-link danger', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      openConfirm({
        title: 'Remove health record?',
        message: `${record.title} for ${record.employeeName} will be deleted.`,
        actionLabel: 'Remove record',
        action: async () => {
          await api(`/api/health-records/${record.id}`, { method: 'DELETE' });
          toast('Health record removed.');
          await loadHealthView();
        },
      });
    });
    actions.append(remove);
    if (!canManageHealth()) actions.replaceChildren(el('span', 'muted', '—'));
    row.append(actions);
    body.append(row);
  }
}

async function loadHealthView() {
  const seq = ++state.healthSeq;
  await ensureEmployees();
  fillDepartmentFilter($('health-filter-employee'));
  const params = new URLSearchParams();
  const q = $('health-filter-q').value.trim();
  const employeeId = $('health-filter-employee').value;
  if (q) params.set('q', q);
  if (employeeId) params.set('employeeId', employeeId);
  const query = params.toString();
  const data = await api(`/api/health-records${query ? `?${query}` : ''}`);
  if (seq !== state.healthSeq) return;
  state.healthRows = data.records;
  renderHealth();
}

const refreshHealthList = debounce(() => {
  loadHealthView().catch((err) => {
    if (err.status === 401) return;
    toast('Could not update health records. Check the connection.');
  });
}, 220);

$('health-filter-q').addEventListener('input', refreshHealthList);
$('health-filter-employee').addEventListener('change', refreshHealthList);
$('health-filter-reset').addEventListener('click', () => {
  $('health-filter-q').value = '';
  $('health-filter-employee').value = '';
  loadHealthView().catch(() => toast('Could not update health records. Check the connection.'));
});

async function openHealthDialog() {
  try {
    await ensureEmployees(true);
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load employees. Check the connection.');
    return;
  }
  if (!state.employees.length) {
    toast('Add an employee before recording health records.');
    return;
  }

  healthForm.reset();
  hideFormError(healthError);
  clearInvalid(healthForm);
  const filteredEmployee = $('health-filter-employee').value;
  fillEmployeeChoose(healthForm.elements.employeeId, {
    placeholder: 'Select employee',
    selectedId: filteredEmployee || undefined,
  });
  healthForm.elements.recordDate.value = todayISO();
  $('health-file').value = '';
  healthDialog.showModal();
}

$('add-health-btn').addEventListener('click', openHealthDialog);

healthForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(healthError);

  const values = Object.fromEntries(new FormData(healthForm));
  const employeeId = Number(values.employeeId);
  const title = String(values.title || '').trim();
  const recordDate = String(values.recordDate || '');
  const notes = String(values.notes || '').trim();

  if (!employeeId) {
    markInvalid(healthForm.elements.employeeId, true);
    showFormError(healthError, 'Choose an employee.');
    return;
  }
  if (!title) {
    markInvalid(healthForm.elements.title, true);
    showFormError(healthError, 'Enter a record title.');
    healthForm.elements.title.focus();
    return;
  }
  if (!recordDate) {
    markInvalid(healthForm.elements.recordDate, true);
    showFormError(healthError, 'Choose the record date.');
    return;
  }

  const file = $('health-file').files[0];
  const problem = file ? validateDocFile(file) : null;
  if (problem) {
    showFormError(healthError, problem);
    return;
  }

  setBusy(healthSubmit, true, 'Add record', 'Saving…');
  try {
    const payload = { employeeId, title, recordDate, notes };
    if (file) {
      const dataUrl = await readFileAsDataURL(file);
      const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (!match) throw new Error('Could not read that file.');
      payload.filename = file.name;
      payload.mime = match[1];
      payload.data = match[2];
    }
    await api('/api/health-records', jsonRequest('POST', payload));
    healthDialog.close();
    toast('Health record added.');
    await loadHealthView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(healthError, err.message);
  } finally {
    setBusy(healthSubmit, false, 'Add record', 'Saving…');
  }
});

/* ---------- Expatriate monitor ---------- */

function renderExpatriates() {
  const { employees, stats } = state.expatriates;
  $('expat-total').textContent = numberFormat.format(stats.total || 0);
  $('expat-expiring').textContent = numberFormat.format(stats.expiringPermits || 0);
  $('expat-expired').textContent = numberFormat.format(stats.expiredDocuments || 0);
  $('expat-accommodation').textContent = numberFormat.format(stats.withAccommodation || 0);
  $('expat-passports').textContent = numberFormat.format(stats.passports || 0);
  $('expat-sub').textContent = employees.length
    ? `${employees.length} ${plural(employees.length, 'expatriate', 'expatriates')} on the register`
    : 'No expatriates on the register yet.';

  const body = $('expat-body');
  body.replaceChildren();
  $('expat-table').hidden = employees.length === 0;
  $('expat-empty').hidden = employees.length > 0;

  for (const employee of employees) {
    const row = document.createElement('tr');

    const employeeCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', employee.fullName), el('span', 'cell-sub', `${employee.staffId} · ${employee.position}`));
    employeeCell.append(stack);
    row.append(employeeCell);

    row.append(el('td', null, employee.nationality || '—'));

    const passportCell = el('td');
    if (employee.passportNumber) {
      const stack = el('div', 'cell-stack');
      stack.append(el('span', 'mono', employee.passportNumber), el('span', 'cell-sub', `Expires ${formatDate(employee.passportExpiry)}`));
      passportCell.append(stack);
    } else {
      passportCell.append(el('span', 'muted', 'Not recorded'));
    }
    passportCell.append(statusTag(employee.passportStatus));
    row.append(passportCell);

    const permitCell = el('td');
    if (employee.workPermitNumber) {
      const stack = el('div', 'cell-stack');
      stack.append(el('span', 'mono', employee.workPermitNumber), el('span', 'cell-sub', `Expires ${formatDate(employee.workPermitExpiry)}`));
      permitCell.append(stack);
    } else {
      permitCell.append(el('span', 'muted', 'Not recorded'));
    }
    permitCell.append(statusTag(employee.permitStatus));
    row.append(permitCell);

    const accommodationCell = el('td');
    if (employee.hasAccommodation) {
      const stack = el('div', 'cell-stack');
      stack.append(el('span', 'status-tag status-ok', 'Yes'));
      if (employee.accommodationDetails) stack.append(el('span', 'cell-sub', employee.accommodationDetails));
      accommodationCell.append(stack);
    } else {
      accommodationCell.append(el('span', 'muted', 'No'));
    }
    row.append(accommodationCell);

    const actions = el('td', 'actions-cell');
    const edit = el('button', 'btn-link', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => openExpatDialog(employee));
    const remove = el('button', 'btn-link danger', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      openConfirm({
        title: 'Remove from expatriate register?',
        message: `${employee.fullName} will stay on the employee list but leave the expatriate monitor.`,
        actionLabel: 'Remove',
        action: async () => {
          await api(`/api/employees/${employee.id}/expatriate`, jsonRequest('PUT', { isExpatriate: false }));
          toast(`${employee.fullName} removed from the expatriate register.`);
          await loadExpatriatesView();
        },
      });
    });
    actions.append(edit, remove);
    if (!canEdit()) actions.replaceChildren(el('span', 'muted', '—'));
    row.append(actions);
    body.append(row);
  }
}

async function loadExpatriatesView() {
  const data = await api('/api/expatriates');
  state.expatriates = data;
  renderExpatriates();
}

async function openExpatDialog(employee = null) {
  try {
    await ensureEmployees(true);
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load employees. Check the connection.');
    return;
  }

  state.editingExpatId = employee ? employee.id : null;
  expatForm.reset();
  hideFormError(expatError);
  clearInvalid(expatForm);

  const registered = new Set(state.expatriates.employees.map((row) => row.id));
  fillEmployeeChoose(expatForm.elements.employeeId, {
    placeholder: employee ? null : 'Select employee',
    selectedId: employee ? employee.id : undefined,
    excludeIds: employee ? null : registered,
  });

  if (!employee && expatForm.elements.employeeId.options.length <= 1) {
    toast('Every employee is already on the expatriate register.');
    return;
  }

  expatForm.elements.employeeId.disabled = Boolean(employee);
  $('expat-dialog-title').textContent = employee ? 'Edit expatriate' : 'Add expatriate';
  $('expat-dialog-sub').textContent = employee
    ? `${employee.fullName} · ${employee.staffId}`
    : 'Record passport, permit and accommodation details.';
  expatSubmit.textContent = employee ? 'Save changes' : 'Add expatriate';

  if (employee) {
    expatForm.elements.nationality.value = employee.nationality;
    expatForm.elements.passportNumber.value = employee.passportNumber;
    expatForm.elements.passportExpiry.value = employee.passportExpiry;
    expatForm.elements.workPermitNumber.value = employee.workPermitNumber;
    expatForm.elements.workPermitExpiry.value = employee.workPermitExpiry;
    expatForm.elements.hasAccommodation.checked = employee.hasAccommodation;
    expatForm.elements.accommodationDetails.value = employee.accommodationDetails;
  }

  expatDialog.showModal();
}

$('add-expat-btn').addEventListener('click', () => openExpatDialog());

expatDialog.addEventListener('close', () => {
  if (expatDialog.open) return;
  state.editingExpatId = null;
  expatForm.elements.employeeId.disabled = false;
});

expatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(expatError);

  const values = Object.fromEntries(new FormData(expatForm));
  const employeeId = state.editingExpatId || Number(values.employeeId);
  if (!employeeId) {
    markInvalid(expatForm.elements.employeeId, true);
    showFormError(expatError, 'Choose an employee.');
    return;
  }

  const payload = {
    isExpatriate: true,
    nationality: String(values.nationality || '').trim(),
    passportNumber: String(values.passportNumber || '').trim(),
    passportExpiry: String(values.passportExpiry || ''),
    workPermitNumber: String(values.workPermitNumber || '').trim(),
    workPermitExpiry: String(values.workPermitExpiry || ''),
    hasAccommodation: expatForm.elements.hasAccommodation.checked,
    accommodationDetails: String(values.accommodationDetails || '').trim(),
  };

  if (!payload.nationality) {
    markInvalid(expatForm.elements.nationality, true);
    showFormError(expatError, 'Enter the employee’s nationality.');
    return;
  }

  const editing = state.editingExpatId !== null;
  const idleLabel = editing ? 'Save changes' : 'Add expatriate';
  setBusy(expatSubmit, true, idleLabel, 'Saving…');
  try {
    state.expatriates = await api(`/api/employees/${employeeId}/expatriate`, jsonRequest('PUT', payload));
    expatDialog.close();
    state.editingExpatId = null;
    renderExpatriates();
    toast(editing ? 'Expatriate details updated.' : 'Employee added to the expatriate register.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(expatError, err.message);
  } finally {
    setBusy(expatSubmit, false, idleLabel, 'Saving…');
  }
});

/* ---------- HR reports ---------- */

function renderReportResults() {
  const box = $('report-results');
  box.replaceChildren();
  for (const match of state.reportMatches) {
    const chip = el('button', `report-chip${state.reportProfile && state.reportProfile.id === match.id ? ' active' : ''}`);
    chip.type = 'button';
    chip.append(
      el('span', null, match.fullName),
      el('small', null, `${match.staffId} · ${match.department}`)
    );
    chip.addEventListener('click', () => loadReport(match.id));
    box.append(chip);
  }
}

function kvSection(title, pairs, wide = false) {
  const section = el('section', `report-section${wide ? ' wide' : ''}`);
  section.append(el('h3', null, title));
  const list = el('dl', 'kv');
  for (const [label, value] of pairs) {
    list.append(el('dt', null, label));
    list.append(el('dd', null, dash(value)));
  }
  section.append(list);
  return section;
}

function tableSection(title, headers, rows, wide = false) {
  const section = el('section', `report-section${wide ? ' wide' : ''}`);
  section.append(el('h3', null, title));
  if (!rows.length) {
    section.append(el('p', 'report-empty-note', 'No records.'));
    return section;
  }
  const table = el('table', 'mini-table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const header of headers) headRow.append(el('th', null, header));
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const cells of rows) {
    const row = document.createElement('tr');
    for (const cell of cells) {
      const td = document.createElement('td');
      if (cell instanceof Node) td.append(cell);
      else td.textContent = dash(cell);
      row.append(td);
    }
    tbody.append(row);
  }
  table.append(tbody);
  section.append(table);
  return section;
}

function renderReport(profile) {
  const sheet = $('report-sheet');
  sheet.replaceChildren();

  const head = el('div', 'report-head');
  if (profile.photoUrl) {
    const photo = document.createElement('img');
    photo.className = 'avatar-sm report-avatar';
    photo.src = `${profile.photoUrl}?v=${Date.now()}`;
    photo.alt = '';
    head.append(photo);
  } else {
    head.append(el('span', 'avatar-sm report-avatar', initials(profile.fullName)));
  }
  const title = el('div');
  title.append(el('h2', null, profile.fullName));
  title.append(el('p', null, `${profile.staffId} · ${profile.position} · ${profile.department}`));
  title.append(el('p', 'muted', `Report prepared ${formatDate(todayISO())}`));
  head.append(title);
  head.append(statusPill(profile.status));
  sheet.append(head);

  const grid = el('div', 'report-grid');

  grid.append(kvSection('Personal details', [
    ['Staff ID', profile.staffId],
    ['Full name', profile.fullName],
    ['Date of birth', profile.dob ? `${formatDate(profile.dob)} (${profile.age} yrs)` : ''],
    ['Sex', profile.sex],
    ['Nationality', profile.nationality],
    ['Marital status', profile.maritalStatus],
    ['Phone', profile.phone],
    ['Email', profile.email],
    ['National ID', profile.nationalIdNumber ? `${profile.nationalIdType || 'ID'} · ${profile.nationalIdNumber}` : ''],
    ['Address', profile.residentialAddress],
  ]));

  grid.append(kvSection('Employment & leave', [
    ['Job title', profile.position],
    ['Department', profile.department],
    ['Employment type', profile.employmentType],
    ['Joined', profile.joinedOn ? `${formatDate(profile.joinedOn)} (${profile.yearsOfService} yrs)` : ''],
    ['Leaving', profile.leavingOn ? formatDate(profile.leavingOn) : ''],
    ['Contract / service end', profile.contractEnd ? formatDate(profile.contractEnd) : ''],
    ['Probation end', profile.probationEnd ? formatDate(profile.probationEnd) : ''],
    ['Status', profile.status],
    ['Expatriate', profile.isExpatriate ? 'Yes' : 'No'],
    [`Leave entitlement (${profile.leaveBalanceYear})`, profile.leaveEntitlement === null ? '' : `${profile.leaveEntitlement} days`],
    ['Carried-in opening', `${profile.leaveOpening} days`],
    ['Approved leave taken', `${profile.leaveTaken} days`],
    ['Leave pending approval', `${profile.leavePending} days`],
    ['Leave balance', profile.leaveBalance === null ? '' : `${profile.leaveBalance} days`],
    ['On leave now', profile.currentLeave ? `${profile.currentLeave.type} · ${formatDate(profile.currentLeave.startOn)} to ${formatDate(profile.currentLeave.endOn)}` : ''],
  ]));

  grid.append(kvSection('Family & contacts', [
    ['Father', profile.fatherName ? `${profile.fatherName} · ${profile.fatherContact || '—'}` : ''],
    ['Mother', profile.motherName ? `${profile.motherName} · ${profile.motherContact || '—'}` : ''],
    ['Spouse', profile.spouseName ? `${profile.spouseName} · ${profile.spouseContact || '—'}` : ''],
    ['Next of kin', profile.nextOfKinName ? `${profile.nextOfKinName} (${profile.nextOfKinRelationship || '—'}) · ${profile.nextOfKinContact || '—'}` : ''],
    ['Emergency contact', profile.emergencyName ? `${profile.emergencyName} (${profile.emergencyRelationship || '—'}) · ${profile.emergencyContact || '—'}` : ''],
  ]));

  grid.append(kvSection('Banking', [
    ['Bank', profile.bankName],
    ['Sort / branch code', profile.bankBranch],
    ['Account name', profile.accountName],
    ['Account number', profile.accountNumber],
    ['SSNIT number', profile.ssnitNumber],
    ['TIN number', profile.tinNumber],
  ]));

  grid.append(kvSection('Health & referees', [
    ['Blood group', profile.bloodGroup],
    ['Known allergies', profile.allergies],
    ['Medical conditions', profile.medicalConditions],
  ]));

  grid.append(tableSection('Dependants', ['Name', 'Date of birth'], profile.dependants.map((row) => [
    row.name, row.dob ? formatDate(row.dob) : '',
  ])));

  grid.append(tableSection('Education', ['Institution', 'Qualification', 'Year'], profile.education.map((row) => [
    row.institution, row.qualification, row.year === null ? '' : String(row.year),
  ])));

  grid.append(tableSection('Work experience', ['Employer', 'Job title', 'From', 'To'], profile.experience.map((row) => [
    row.employer, row.jobTitle, row.startYear === null ? '' : String(row.startYear), row.endYear === null ? '' : String(row.endYear),
  ])));

  grid.append(tableSection('Referees', ['Name', 'Relationship', 'Contact'], profile.referees.map((row) => [
    row.name, row.relationship, row.contact,
  ])));

  grid.append(tableSection('Training', ['Training', 'Date', 'Score', 'Certificate'], profile.training.map((row) => [
    row.title,
    formatDate(row.completedOn),
    row.score === null ? '—' : String(row.score),
    row.certificateIssued ? 'Yes' : 'No',
  ]), true));

  grid.append(tableSection('Health records', ['Record', 'Date', 'Notes', 'Attachment'], profile.healthRecords.map((row) => {
    const attachment = row.hasFile ? (() => {
      const link = el('a', 'btn-link', 'Open file');
      link.href = row.fileUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      return link;
    })() : '—';
    return [row.title, formatDate(row.recordDate), row.notes, attachment];
  }), true));

  grid.append(tableSection('Documents', ['Title', 'File', 'Uploaded'], profile.documents.map((row) => {
    const link = el('a', 'btn-link', 'Download');
    link.href = row.downloadUrl;
    link.download = row.filename;
    return [row.title, link, formatStamp(row.uploadedAt)];
  }), true));

  sheet.append(grid);
  sheet.hidden = false;
  $('report-empty').hidden = true;
  $('report-print-btn').hidden = false;
  renderReportResults();
}

async function loadReport(employeeId) {
  try {
    const data = await api(`/api/employees/${employeeId}`);
    state.reportProfile = data.employee;
    renderReport(data.employee);
  } catch (err) {
    if (err.status === 401) return;
    toast(err.message);
  }
}

const runReportSearch = debounce(async () => {
  const q = $('report-search').value.trim();
  const seq = ++state.reportSeq;
  if (!q) {
    state.reportMatches = [];
    state.reportProfile = null;
    $('report-results').replaceChildren();
    $('report-sheet').hidden = true;
    $('report-print-btn').hidden = true;
    $('report-empty').hidden = false;
    $('report-empty').textContent = 'Search for an employee to open their full HR report.';
    return;
  }

  try {
    const data = await api(`/api/employees?q=${encodeURIComponent(q)}`);
    if (seq !== state.reportSeq) return;
    state.reportMatches = data.employees;
    state.reportProfile = null;
    renderReportResults();

    if (!data.employees.length) {
      $('report-sheet').hidden = true;
      $('report-print-btn').hidden = true;
      $('report-empty').hidden = false;
      $('report-empty').textContent = `No employees match “${q}”.`;
      return;
    }

    await loadReport(data.employees[0].id);
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not search employees. Check the connection.');
  }
}, 220);

$('report-search').addEventListener('input', runReportSearch);

function initReportsView() {
  if (state.reportProfile) {
    renderReport(state.reportProfile);
    return;
  }
  $('report-sheet').hidden = true;
  $('report-print-btn').hidden = true;
  $('report-empty').hidden = false;
  if (!$('report-search').value.trim()) {
    $('report-empty').textContent = 'Search for an employee to open their full HR report.';
  }
}

$('report-print-btn').addEventListener('click', () => window.print());

/* ---------- Reminders ---------- */

function renderReminders() {
  const { birthdays, tasks, upcoming } = state.reminders;
  $('birthday-sub').textContent = `${birthdays.length} ${plural(birthdays.length, 'birthday', 'birthdays')} in the next 60 days`;
  $('tasks-sub').textContent = tasks.length
    ? `${tasks.filter((task) => !task.done).length} open · ${tasks.filter((task) => task.done).length} done`
    : 'No tasks yet.';

  const birthdayBody = $('birthday-body');
  birthdayBody.replaceChildren();
  $('birthday-table').hidden = birthdays.length === 0;
  $('birthday-empty').hidden = birthdays.length > 0;

  for (const birthday of birthdays) {
    const row = document.createElement('tr');
    const employeeCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', birthday.fullName), el('span', 'cell-sub', birthday.staffId));
    employeeCell.append(stack);
    row.append(employeeCell);
    row.append(el('td', 'department', birthday.department));
    row.append(el('td', null, formatDate(birthday.date)));
    row.append(el('td', 'num', String(birthday.turning)));
    row.append(el('td', `num${birthday.days === 0 ? ' task-overdue' : ''}`, daysLabel(birthday.days)));
    birthdayBody.append(row);
  }

  const tasksBody = $('tasks-body');
  tasksBody.replaceChildren();
  $('tasks-table').hidden = tasks.length === 0;
  $('tasks-empty').hidden = tasks.length > 0;

  for (const task of tasks) {
    const row = document.createElement('tr');
    if (task.done) row.classList.add('task-done');

    const doneCell = el('td', 'check-col');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-check';
    checkbox.checked = task.done;
    checkbox.disabled = !canEdit();
    checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.done ? 'not done' : 'done'}`);
    checkbox.addEventListener('change', async () => {
      try {
        state.reminders = await api(`/api/reminders/${task.id}`, jsonRequest('PATCH', { done: checkbox.checked }));
        renderReminders();
      } catch (err) {
        if (err.status === 401) return;
        checkbox.checked = !checkbox.checked;
        toast('Could not update that task.');
      }
    });
    doneCell.append(checkbox);
    row.append(doneCell);

    const taskCell = el('td');
    taskCell.append(el('span', 'task-title', task.title));
    if (task.notes) taskCell.append(el('div', 'task-notes', task.notes));
    row.append(taskCell);

    const dueCell = el('td');
    dueCell.append(el('span', null, formatDate(task.dueOn)));
    const dueLabel = task.daysLeft === null ? '' : ` · ${daysLabel(task.daysLeft)}`;
    dueCell.append(el('div', `task-notes${!task.done && task.daysLeft < 0 ? ' task-overdue' : ''}`, dueLabel.replace(' · ', '')));
    row.append(dueCell);

    const actions = el('td', 'actions-cell');
    const remove = el('button', 'btn-link danger', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      openConfirm({
        title: 'Remove task?',
        message: `“${task.title}” will be deleted.`,
        actionLabel: 'Remove task',
        action: async () => {
          await api(`/api/reminders/${task.id}`, { method: 'DELETE' });
          toast('Task removed.');
          await loadRemindersView();
        },
      });
    });
    actions.append(remove);
    if (!canEdit()) actions.replaceChildren(el('span', 'muted', '—'));
    row.append(actions);

    tasksBody.append(row);
  }

  const upcomingRows = upcoming || [];
  $('upcoming-sub').textContent = upcomingRows.length
    ? `${upcomingRows.length} ${plural(upcomingRows.length, 'date', 'dates')} within 90 days`
    : 'Nothing due in the next 90 days.';
  const upcomingBody = $('upcoming-body');
  upcomingBody.replaceChildren();
  $('upcoming-table').hidden = upcomingRows.length === 0;
  $('upcoming-empty').hidden = upcomingRows.length > 0;

  for (const item of upcomingRows) {
    const row = document.createElement('tr');
    const employeeCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', item.fullName), el('span', 'cell-sub', item.staffId));
    employeeCell.append(stack);
    row.append(employeeCell);
    row.append(el('td', 'department', item.department));
    row.append(el('td', null, item.label));
    row.append(el('td', 'joined', formatDate(item.date)));
    row.append(el('td', `num${item.days < 0 ? ' task-overdue' : ''}`, daysLabel(item.days)));
    upcomingBody.append(row);
  }
}

async function loadRemindersView() {
  state.reminders = await api('/api/reminders');
  renderReminders();
}

function openReminderDialog() {
  reminderForm.reset();
  hideFormError(reminderError);
  clearInvalid(reminderForm);
  reminderForm.elements.dueOn.value = offsetISO(7);
  reminderDialog.showModal();
}

$('add-reminder-btn').addEventListener('click', openReminderDialog);

reminderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(reminderError);

  const values = Object.fromEntries(new FormData(reminderForm));
  const payload = {
    title: String(values.title || '').trim(),
    dueOn: String(values.dueOn || ''),
    notes: String(values.notes || '').trim(),
  };

  if (!payload.title) {
    markInvalid(reminderForm.elements.title, true);
    showFormError(reminderError, 'Enter a task title.');
    reminderForm.elements.title.focus();
    return;
  }
  if (!payload.dueOn) {
    markInvalid(reminderForm.elements.dueOn, true);
    showFormError(reminderError, 'Choose a due date.');
    return;
  }

  setBusy(reminderSubmit, true, 'Add task', 'Saving…');
  try {
    state.reminders = await api('/api/reminders', jsonRequest('POST', payload));
    reminderDialog.close();
    renderReminders();
    toast('Task added.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(reminderError, err.message);
  } finally {
    setBusy(reminderSubmit, false, 'Add task', 'Saving…');
  }
});

/* ---------- Departments ---------- */

function fillDepartmentHeadOptions() {
  return state.employees || [];
}

function renderDepartments() {
  const body = $('departments-body');
  body.replaceChildren();

  const custom = selectableDepartments();
  const unassigned = state.departments
    .filter((department) => department.system)
    .reduce((sum, department) => sum + department.staffCount, 0);
  const unitTotal = state.departments.reduce(
    (sum, department) => sum + (Array.isArray(department.units) ? department.units.length : 0),
    0
  );
  $('departments-sub').textContent =
    `${custom.length} ${plural(custom.length, 'department', 'departments')}` +
    (unitTotal ? ` · ${unitTotal} ${plural(unitTotal, 'unit', 'units')}` : '') +
    (unassigned
      ? ` · ${unassigned} unassigned ${plural(unassigned, 'employee', 'employees')}`
      : '');

  for (const department of state.departments) {
    const row = document.createElement('tr');
    row.dataset.id = String(department.id);

    const nameCell = el('td', 'name');
    nameCell.append(document.createTextNode(department.name));
    if (department.system) nameCell.append(el('span', 'tag', 'System'));
    row.append(nameCell);

    const headCell = el('td');
    if (department.headName) {
      const stack = el('div', 'cell-stack');
      stack.append(el('span', null, department.headName), el('span', 'cell-sub', department.headStaffId));
      headCell.append(stack);
    } else {
      headCell.append(el('span', 'muted', 'Not set'));
    }
    row.append(headCell);

    const units = Array.isArray(department.units) ? department.units : [];
    const unitsCell = el('td');
    if (department.system) {
      unitsCell.append(el('span', 'muted', '—'));
    } else {
      const toggle = el(
        'button',
        'btn-link',
        units.length ? `${units.length} ${plural(units.length, 'unit', 'units')}` : 'Add unit'
      );
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(state.expandedDepartment === department.id));
      toggle.addEventListener('click', () => {
        state.expandedDepartment = state.expandedDepartment === department.id ? null : department.id;
        renderDepartments();
      });
      unitsCell.append(toggle);
    }
    row.append(unitsCell);

    row.append(el('td', 'num', numberFormat.format(department.staffCount)));

    const actions = el('td', 'actions-cell');
    if (department.system) {
      actions.append(el('span', 'muted', '—'));
    } else {
      const edit = el('button', 'btn-link', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', () => openDepartmentDialog(department));

      const remove = el('button', 'btn-link danger', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', () => confirmRemoveDepartment(department));

      actions.append(edit, remove);
    }
    if (!canEdit()) actions.replaceChildren(el('span', 'muted', '—'));
    row.append(actions);

    body.appendChild(row);

    if (!department.system && state.expandedDepartment === department.id) {
      body.appendChild(unitsRow(department, units));
    }
  }
}

function unitsRow(department, units) {
  const row = document.createElement('tr');
  row.className = 'units-row';

  const cell = document.createElement('td');
  cell.colSpan = 5;

  const panel = el('div', 'units-panel');
  const head = el('div', 'units-head');
  head.append(el('span', 'units-title', `Units in ${department.name}`));
  if (canEdit()) {
    const add = el('button', 'btn btn-quiet btn-sm', 'Add unit');
    add.type = 'button';
    add.addEventListener('click', () => openUnitDialog(department, null));
    head.append(add);
  }
  panel.append(head);

  if (!units.length) {
    panel.append(el('p', 'muted', 'No units yet. Add groups like Payroll, Recruitment or Warehouse.'));
  } else {
    const list = el('ul', 'unit-list');
    for (const unit of units) {
      const item = el('li', 'unit-item');
      item.append(el('span', 'unit-name', unit.name));
      item.append(
        el('span', 'unit-count', `${unit.staffCount} ${plural(unit.staffCount, 'employee', 'employees')}`)
      );
      if (canEdit()) {
        const actions = el('span', 'unit-actions');
        const rename = el('button', 'btn-link', 'Rename');
        rename.type = 'button';
        rename.addEventListener('click', () => openUnitDialog(department, unit));

        const remove = el('button', 'btn-link danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', () => confirmRemoveUnit(department, unit));

        actions.append(rename, remove);
        item.append(actions);
      }
      list.append(item);
    }
    panel.append(list);
  }

  cell.append(panel);
  row.append(cell);
  return row;
}

async function loadDepartmentsView() {
  const seq = ++state.deptSeq;
  const [departmentData] = await Promise.all([api('/api/departments'), ensureEmployees(true)]);
  if (seq !== state.deptSeq) return;
  state.departments = departmentData.departments;
  if (
    state.expandedDepartment !== null &&
    !state.departments.some((department) => department.id === state.expandedDepartment)
  ) {
    state.expandedDepartment = null;
  }
  departmentsLoaded = true;
  fillDepartmentSelect();
  fillEmployeeFilterDepartments();
  renderDepartments();
}

async function openDepartmentDialog(department = null) {
  try {
    await ensureEmployees();
  } catch {
    /* heads stay optional if the roster cannot be loaded */
  }

  state.editingDepartment = department ? department.id : null;
  departmentForm.reset();
  hideFormError(departmentError);
  clearInvalid(departmentForm);
  fillHeadSelect(department ? department.headEmployeeId : null);
  departmentForm.elements.name.value = department ? department.name : '';
  $('department-dialog-title').textContent = department ? 'Edit department' : 'Add department';
  $('department-dialog-sub').textContent = department
    ? 'Rename the department or change who leads it.'
    : 'Create a department and choose who leads it.';
  $('department-submit').textContent = department ? 'Save changes' : 'Add department';
  departmentDialog.showModal();
  setTimeout(() => departmentForm.elements.name.focus(), 30);
}

$('add-department-btn').addEventListener('click', () => openDepartmentDialog());

departmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(departmentError);

  const nameInput = departmentForm.elements.name;
  const name = nameInput.value.trim();
  const headValue = departmentForm.elements.headEmployeeId.value;

  if (!name) {
    markInvalid(nameInput, true);
    showFormError(departmentError, 'Enter a department name.');
    nameInput.focus();
    return;
  }

  const payload = { name, headEmployeeId: headValue ? Number(headValue) : null };
  const editing = state.editingDepartment !== null;
  const idleLabel = editing ? 'Save changes' : 'Add department';

  setBusy(departmentSubmit, true, idleLabel, 'Saving…');
  try {
    if (editing) {
      await api(`/api/departments/${state.editingDepartment}`, jsonRequest('PATCH', payload));
      toast('Department updated.');
    } else {
      const data = await api('/api/departments', jsonRequest('POST', payload));
      toast(`${data.department.name} added.`);
    }
    departmentDialog.close();
    departmentsLoaded = false;
    await loadDepartmentsView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(departmentError, err.message);
  } finally {
    setBusy(departmentSubmit, false, idleLabel, 'Saving…');
  }
});

function openUnitDialog(department, unit) {
  state.unitDepartmentId = department.id;
  state.editingUnit = unit ? unit.id : null;
  unitForm.reset();
  hideFormError(unitError);
  clearInvalid(unitForm);
  unitForm.elements.unitName.value = unit ? unit.name : '';
  $('unit-dialog-title').textContent = unit ? 'Rename unit' : 'Add unit';
  $('unit-dialog-sub').textContent = department.name;
  unitSubmit.textContent = unit ? 'Save changes' : 'Add unit';
  unitDialog.showModal();
  setTimeout(() => unitForm.elements.unitName.focus(), 30);
}

unitForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(unitError);

  const input = unitForm.elements.unitName;
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) {
    markInvalid(input, true);
    showFormError(unitError, 'Enter a unit name.');
    input.focus();
    return;
  }

  const editing = state.editingUnit !== null;
  const idleLabel = editing ? 'Save changes' : 'Add unit';

  setBusy(unitSubmit, true, idleLabel, 'Saving…');
  try {
    if (editing) {
      await api(`/api/units/${state.editingUnit}`, jsonRequest('PATCH', { name }));
      toast('Unit updated.');
    } else {
      await api(`/api/departments/${state.unitDepartmentId}/units`, jsonRequest('POST', { name }));
      toast(`${name} added.`);
    }
    unitDialog.close();
    departmentsLoaded = false;
    await loadDepartmentsView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(unitError, err.message);
  } finally {
    setBusy(unitSubmit, false, idleLabel, 'Saving…');
  }
});

function confirmRemoveUnit(department, unit) {
  openConfirm({
    title: `Remove ${unit.name}?`,
    message: unit.staffCount
      ? `${unit.staffCount} ${plural(unit.staffCount, 'employee', 'employees')} will be left without a unit. Their department stays the same.`
      : 'This unit has no staff. This cannot be undone.',
    actionLabel: 'Remove unit',
    action: async () => {
      const result = await api(`/api/units/${unit.id}`, { method: 'DELETE' });
      toast(
        result.moved
          ? `${unit.name} removed. ${result.moved} ${plural(result.moved, 'employee', 'employees')} now have no unit.`
          : `${unit.name} removed.`
      );
      departmentsLoaded = false;
      await loadDepartmentsView();
    },
  });
}

function openConfirm({ title, message, actionLabel, busyLabel = 'Removing…', action }) {
  $('confirm-title').textContent = title;
  $('confirm-message').textContent = message;
  confirmSubmit.textContent = actionLabel;
  hideFormError(confirmError);
  state.confirmAction = action;
  state.confirmBusyLabel = busyLabel;
  confirmDialog.showModal();
}

confirmDialog.addEventListener('close', () => {
  state.confirmAction = null;
  state.confirmBusyLabel = null;
});

confirmSubmit.addEventListener('click', async () => {
  if (!state.confirmAction) return;
  hideFormError(confirmError);
  const idleLabel = confirmSubmit.textContent;
  setBusy(confirmSubmit, true, idleLabel, state.confirmBusyLabel || 'Removing…');
  try {
    await state.confirmAction();
    confirmDialog.close();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(confirmError, err.message);
  } finally {
    setBusy(confirmSubmit, false, idleLabel, state.confirmBusyLabel || 'Removing…');
  }
});

function confirmRemoveDepartment(department) {
  const count = department.staffCount;
  openConfirm({
    title: `Remove ${department.name}?`,
    message: count
      ? `${count} ${plural(count, 'employee', 'employees')} will move to the “Unassigned” department.`
      : 'This department has no staff. This cannot be undone.',
    actionLabel: 'Remove department',
    action: async () => {
      const result = await api(`/api/departments/${department.id}`, { method: 'DELETE' });
      toast(
        result.moved
          ? `${department.name} removed. ${result.moved} ${plural(result.moved, 'employee', 'employees')} moved to Unassigned.`
          : `${department.name} removed.`
      );
      departmentsLoaded = false;
      state.employeesLoaded = false;
      await loadDepartmentsView();
    },
  });
}

/* ---------- Payroll ---------- */

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function computePaye(taxable) {
  let remaining = Math.max(0, Number(taxable) || 0);
  let tax = 0;
  for (const band of state.payrollTaxes.payeBands) {
    if (remaining <= 0) break;
    const slice = band.width === null ? remaining : Math.min(remaining, band.width);
    tax += slice * band.rate / 100;
    remaining -= slice;
  }
  return roundMoney(tax);
}

function payrollFigures(amounts, factor = 1) {
  const share = Number.isFinite(Number(factor)) ? Number(factor) : 1;
  const basic = roundMoney(roundMoney(amounts.basicSalary) * share);
  const gross = roundMoney(
    basic + roundMoney(roundMoney(amounts.housingAllowance) * share) +
    roundMoney(roundMoney(amounts.transportAllowance) * share) +
    roundMoney(roundMoney(amounts.otherAllowance) * share)
  );
  const ssnitEmployee = roundMoney(basic * state.payrollTaxes.ssnitEmployeeRate / 100);
  const ssnitEmployer = roundMoney(basic * state.payrollTaxes.ssnitEmployerRate / 100);
  const paye = computePaye(roundMoney(gross - ssnitEmployee));
  const net = roundMoney(gross - ssnitEmployee - paye - roundMoney(amounts.otherDeductions));
  return { gross, ssnitEmployee, ssnitEmployer, paye, net };
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function payrollStatusPill(status) {
  return el('span', `pill ${status === 'Approved' ? 'pill-active' : 'pill-draft'}`, status);
}

function mergeRunSummary(run) {
  const summary = { ...run };
  delete summary.items;
  const index = state.payrollRuns.findIndex((row) => row.id === run.id);
  if (index >= 0) state.payrollRuns[index] = summary;
  else state.payrollRuns.unshift(summary);
}

function renderPayrollRuns() {
  const body = $('payroll-runs-body');
  body.replaceChildren();
  const runs = state.payrollRuns;

  $('payroll-empty').hidden = runs.length > 0;
  $('payroll-runs-table').hidden = runs.length === 0;
  $('payroll-sub').textContent = runs.length
    ? `${runs.length} ${plural(runs.length, 'run', 'runs')} · latest ${runs[0].label}`
    : 'Create a monthly run to draft payslips for every active employee with a salary.';

  for (const run of runs) {
    const row = document.createElement('tr');
    if (run.id === state.payrollRunId) row.classList.add('row-selected');
    row.append(el('td', 'name', run.label));
    row.append(el('td', 'num', String(run.totals.staffCount)));
    row.append(el('td', 'num', money(run.totals.gross)));
    row.append(el('td', 'num', money(run.totals.ssnitEmployee)));
    row.append(el('td', 'num', money(run.totals.paye)));
    row.append(el('td', 'num', money(run.totals.otherDeductions)));
    row.append(el('td', 'num', money(run.totals.net)));
    const status = el('td');
    status.append(payrollStatusPill(run.status));
    if (run.warningCount) {
      status.append(el('span', 'payroll-warn-flag', `${run.warningCount} ${plural(run.warningCount, 'needs', 'need')} details`));
    }
    row.append(status);

    const actions = el('td', 'actions-cell');
    const open = el('button', 'btn-link', 'Open');
    open.type = 'button';
    open.addEventListener('click', () => openPayrollRun(run.id));
    actions.append(open);
    row.append(actions);
    body.append(row);
  }
}

function payrollNames(list) {
  const shown = list.slice(0, 4).map((item) => `${item.fullName} (${item.staffId})`);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(', ')} +${extra} more` : shown.join(', ');
}

function renderPayrollWarnings(warnings) {
  const box = $('payroll-warnings');
  if (!warnings.length) {
    box.hidden = true;
    box.replaceChildren();
    return;
  }
  const missingSsnit = warnings.filter((item) => item.missing.includes('SSNIT number'));
  const missingBank = warnings.filter((item) => item.missing.includes('bank account'));

  box.replaceChildren();
  box.append(el('strong', null,
    `${warnings.length} ${plural(warnings.length, 'payslip needs', 'payslips need')} details before SSNIT or bank filing`));
  const list = el('ul');
  if (missingSsnit.length) list.append(el('li', null, `SSNIT number missing: ${payrollNames(missingSsnit)}`));
  if (missingBank.length) list.append(el('li', null, `Bank account missing: ${payrollNames(missingBank)}`));
  list.append(el('li', null, 'Payslips still print, but the SSNIT schedule and bank payment file will be incomplete.'));
  box.append(list);
  box.hidden = false;
}

function renderPayrollRun(run) {
  const panel = $('payroll-run-panel');
  if (!run) {
    panel.hidden = true;
    $('payroll-warnings').hidden = true;
    return;
  }
  panel.hidden = false;

  $('payroll-run-title').textContent = `${run.label} payroll`;
  const subtitle = [
    `${run.totals.staffCount} ${plural(run.totals.staffCount, 'payslip', 'payslips')}`,
    `Created ${formatStamp(run.createdAt)}`,
    run.status === 'Approved'
      ? `Approved ${formatStamp(run.approvedAt)}`
      : isAdmin() ? 'Editable draft' : 'Draft · approval by an administrator',
  ];
  $('payroll-run-sub').textContent = subtitle.join(' · ');
  $('payroll-run-status').replaceChildren(payrollStatusPill(run.status));

  $('payroll-approve-btn').hidden = !isAdmin() || run.status !== 'Draft';
  $('payroll-delete-btn').hidden = !canEdit() || run.status !== 'Draft';
  $('payroll-reopen-btn').hidden = !isAdmin() || run.status !== 'Approved';

  renderPayrollWarnings(run.warnings || []);

  const summary = $('payroll-summary');
  summary.replaceChildren();
  const tiles = [
    ['Staff paid', String(run.totals.staffCount)],
    ['Gross pay', money(run.totals.gross)],
    ['SSNIT employee', money(run.totals.ssnitEmployee)],
    ['SSNIT employer', money(run.totals.ssnitEmployer)],
    ['PAYE', money(run.totals.paye)],
    ['Other deductions', money(run.totals.otherDeductions)],
    ['Net pay', money(run.totals.net)],
  ];
  for (const [label, value] of tiles) {
    const tile = el('div', 'payroll-tile');
    tile.append(el('span', 'payroll-tile-label', label));
    tile.append(el('strong', 'payroll-tile-value', value));
    summary.append(tile);
  }

  const body = $('payroll-items-body');
  body.replaceChildren();
  const items = run.items;
  $('payroll-items-empty').hidden = items.length > 0;
  $('payroll-items-table').hidden = items.length === 0;

  const totals = { basic: 0, allowances: 0, gross: 0, ssnit: 0, paye: 0, other: 0, net: 0 };
  for (const item of items) {
    const allowances = roundMoney(item.housingAllowance + item.transportAllowance + item.otherAllowance);
    totals.basic += item.basicSalary;
    totals.allowances += allowances;
    totals.gross += item.gross;
    totals.ssnit += item.ssnitEmployee;
    totals.paye += item.paye;
    totals.other += item.otherDeductions;
    totals.net += item.net;

    const row = document.createElement('tr');
    row.dataset.id = String(item.id);
    row.append(el('td', 'staff-id', item.staffId));
    const nameCell = el('td', 'name', item.fullName);
    if (item.prorationNote) nameCell.append(el('div', 'cell-sub', item.prorationNote));
    row.append(nameCell);
    const prorated = item.periodDays > 0 && item.paidDays < item.periodDays;
    const daysText = item.periodDays ? `${item.paidDays} / ${item.periodDays}` : 'Full';
    const daysCell = el('td', `num days-paid${prorated ? ' prorated' : ''}`, daysText);
    if (prorated) daysCell.title = `${item.paidDays} of ${item.periodDays} working days paid`;
    row.append(daysCell);
    row.append(el('td', 'num', money(item.basicSalary)));
    row.append(el('td', 'num', money(allowances)));
    row.append(el('td', 'num', money(item.gross)));
    row.append(el('td', 'num', money(item.ssnitEmployee)));
    row.append(el('td', 'num', money(item.paye)));
    row.append(el('td', 'num', money(item.otherDeductions)));
    row.append(el('td', 'num', money(item.net)));

    const actions = el('td', 'actions-cell');
    if (canEdit() && run.status === 'Draft') {
      const days = el('button', 'btn-link', 'Days');
      days.type = 'button';
      days.addEventListener('click', () => openPayrollDays(item));
      actions.append(days);
      const edit = el('button', 'btn-link', 'Edit');
      edit.type = 'button';
      edit.addEventListener('click', () => openPayslipEditor(item));
      actions.append(edit);
    }
    const payslip = el('button', 'btn-link', 'Payslip');
    payslip.type = 'button';
    payslip.addEventListener('click', () => openPayslip(item.id));
    actions.append(payslip);
    row.append(actions);
    body.append(row);
  }

  if (items.length) {
    const row = el('tr', 'payroll-total-row');
    const label = el('td', null, 'Total');
    label.colSpan = 3;
    row.append(label);
    row.append(el('td', 'num', money(totals.basic)));
    row.append(el('td', 'num', money(totals.allowances)));
    row.append(el('td', 'num', money(totals.gross)));
    row.append(el('td', 'num', money(totals.ssnit)));
    row.append(el('td', 'num', money(totals.paye)));
    row.append(el('td', 'num', money(totals.other)));
    row.append(el('td', 'num', money(totals.net)));
    row.append(el('td'));
    body.append(row);
  }
}

async function loadPayrollView() {
  const seq = ++state.payrollSeq;
  const data = await api('/api/payroll');
  if (seq !== state.payrollSeq) return;
  state.payrollRuns = data.runs;

  if (!state.payrollRuns.length) {
    state.payrollRun = null;
    state.payrollRunId = null;
    hidePayslip();
    renderPayrollRuns();
    renderPayrollRun(null);
    return;
  }

  const target =
    state.payrollRunId && state.payrollRuns.some((run) => run.id === state.payrollRunId)
      ? state.payrollRunId
      : state.payrollRuns[0].id;
  renderPayrollRuns();
  await openPayrollRun(target, { scroll: false });
}

async function openPayrollRun(id, { scroll = true } = {}) {
  const seq = ++state.payrollDetailSeq;
  try {
    const data = await api(`/api/payroll/${id}`);
    if (seq !== state.payrollDetailSeq) return;
    state.payrollRun = data.run;
    state.payrollRunId = data.run.id;
    mergeRunSummary(data.run);
    renderPayrollRuns();
    renderPayrollRun(data.run);
    if (scroll) $('payroll-run-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (err.status === 401) return;
    toast(err.message);
  }
}

function openPayrollDialog() {
  payrollForm.reset();
  hideFormError(payrollError);
  clearInvalid(payrollForm);
  payrollForm.elements.period.value = currentMonth();
  payrollDialog.showModal();
}

$('new-payroll-btn').addEventListener('click', openPayrollDialog);

payrollForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(payrollError);

  const period = String(payrollForm.elements.period.value || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    markInvalid(payrollForm.elements.period, true);
    showFormError(payrollError, 'Choose the month for this payroll run.');
    return;
  }

  setBusy(payrollSubmit, true, 'Create payroll', 'Creating…');
  try {
    const data = await api('/api/payroll', jsonRequest('POST', { period }));
    payrollDialog.close();
    state.payrollRunId = data.run.id;
    const warnings = (data.warnings || []).length;
    const parts = [`${data.run.label} payroll drafted for ${data.run.totals.staffCount} staff.`];
    if (data.skipped) parts.push(`${data.skipped} skipped without a basic salary.`);
    if (data.skippedNoDate) parts.push(`${data.skippedNoDate} inactive ${plural(data.skippedNoDate, 'employee', 'employees')} skipped without a leaving date.`);
    if (warnings) parts.push(`${warnings} ${plural(warnings, 'payslip needs', 'payslips need')} SSNIT or bank details.`);
    toast(parts.join(' '));
    await loadPayrollView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(payrollError, err.message);
  } finally {
    setBusy(payrollSubmit, false, 'Create payroll', 'Creating…');
  }
});

$('payroll-approve-btn').addEventListener('click', () => {
  const run = state.payrollRun;
  if (!run) return;
  openConfirm({
    title: `Approve the ${run.label} payroll?`,
    message: `${run.totals.staffCount} ${plural(run.totals.staffCount, 'payslip', 'payslips')} totalling ${money(run.totals.net)} net will be locked for editing. An admin can reopen it later.`,
    actionLabel: 'Approve payroll',
    busyLabel: 'Approving…',
    action: async () => {
      const data = await api(`/api/payroll/${run.id}/approve`, { method: 'POST' });
      state.payrollRun = data.run;
      mergeRunSummary(data.run);
      renderPayrollRuns();
      renderPayrollRun(data.run);
      toast(`${run.label} payroll approved.`);
    },
  });
});

$('payroll-reopen-btn').addEventListener('click', () => {
  const run = state.payrollRun;
  if (!run) return;
  openConfirm({
    title: `Reopen the ${run.label} payroll?`,
    message: 'Payslips become editable again until the run is approved.',
    actionLabel: 'Reopen payroll',
    busyLabel: 'Reopening…',
    action: async () => {
      const data = await api(`/api/payroll/${run.id}/reopen`, { method: 'POST' });
      state.payrollRun = data.run;
      mergeRunSummary(data.run);
      renderPayrollRuns();
      renderPayrollRun(data.run);
      toast(`${run.label} payroll reopened.`);
    },
  });
});

$('payroll-delete-btn').addEventListener('click', () => {
  const run = state.payrollRun;
  if (!run) return;
  openConfirm({
    title: `Delete the ${run.label} payroll?`,
    message: `The draft and its ${run.totals.staffCount} ${plural(run.totals.staffCount, 'payslip', 'payslips')} will be removed. This cannot be undone.`,
    actionLabel: 'Delete payroll',
    busyLabel: 'Deleting…',
    action: async () => {
      await api(`/api/payroll/${run.id}`, { method: 'DELETE' });
      state.payrollRunId = null;
      state.payrollRun = null;
      hidePayslip();
      toast(`${run.label} payroll deleted.`);
      await loadPayrollView();
    },
  });
});

function fillPayslipForm(item) {
  const monthly = {
    basicSalary: item.monthlyBasic ?? item.basicSalary,
    housingAllowance: item.monthlyHousing ?? item.housingAllowance,
    transportAllowance: item.monthlyTransport ?? item.transportAllowance,
    otherAllowance: item.monthlyOther ?? item.otherAllowance,
  };
  for (const name of ['basicSalary', 'housingAllowance', 'transportAllowance', 'otherAllowance']) {
    payslipEditForm.elements[name].value = String(monthly[name]);
  }
  payslipEditForm.elements.otherDeductions.value = String(item.otherDeductions);
  payslipEditForm.elements.otherDeductionNote.value = item.otherDeductionNote;
}

function payslipFormAmounts() {
  const amount = (name) => {
    const raw = payslipEditForm.elements[name].value;
    return raw === '' ? 0 : Number(raw) || 0;
  };
  return {
    basicSalary: amount('basicSalary'),
    housingAllowance: amount('housingAllowance'),
    transportAllowance: amount('transportAllowance'),
    otherAllowance: amount('otherAllowance'),
    otherDeductions: amount('otherDeductions'),
  };
}

function payslipFactor() {
  const item = state.editingPayslip;
  if (!item || !item.periodDays) return 1;
  return Math.min(1, (Number(item.paidDays) || 0) / item.periodDays);
}

function updatePayslipPreview() {
  const figures = payrollFigures(payslipFormAmounts(), payslipFactor());
  const item = state.editingPayslip;
  const paidText = item && item.periodDays && payslipFactor() < 1
    ? `Paid for ${item.paidDays} of ${item.periodDays} days · `
    : '';
  $('payslip-preview').textContent =
    `${paidText}Gross ${money(figures.gross)} · SSNIT ${money(figures.ssnitEmployee)} · PAYE ${money(figures.paye)} · Other deductions ${money(figures.gross - figures.ssnitEmployee - figures.paye - figures.net)} · Net ${money(figures.net)}`;
}

function openPayslipEditor(item) {
  state.editingPayslipId = item.id;
  state.editingPayslip = item;
  payslipEditForm.reset();
  hideFormError(payslipEditError);
  clearInvalid(payslipEditForm);
  const parts = [item.fullName, item.staffId, state.payrollRun ? state.payrollRun.label : ''];
  if (item.prorationNote) parts.push(item.prorationNote);
  $('payslip-edit-sub').textContent = parts.filter(Boolean).join(' · ');
  fillPayslipForm(item);
  updatePayslipPreview();
  payslipEditDialog.showModal();
}

payslipEditForm.addEventListener('input', (event) => {
  if (event.target.matches('input, select, textarea')) markInvalid(event.target, false);
  if (event.target.name !== 'otherDeductionNote') updatePayslipPreview();
});

payslipEditDialog.addEventListener('close', () => {
  state.editingPayslipId = null;
  state.editingPayslip = null;
});

payslipEditForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(payslipEditError);
  const itemId = state.editingPayslipId;
  if (!itemId) return;

  const amounts = payslipFormAmounts();
  const figures = payrollFigures(amounts, payslipFactor());
  if (figures.net < 0) {
    const available = roundMoney(figures.gross - figures.ssnitEmployee - figures.paye);
    markInvalid(payslipEditForm.elements.otherDeductions, true);
    showFormError(payslipEditError, `Deductions cannot exceed ${money(available)} — the pay left after SSNIT and PAYE.`);
    return;
  }

  const payload = {
    ...amounts,
    otherDeductionNote: String(payslipEditForm.elements.otherDeductionNote.value || '').trim(),
  };

  setBusy(payslipEditSubmit, true, 'Save payslip', 'Saving…');
  try {
    const data = await api(`/api/payroll/items/${itemId}`, jsonRequest('PATCH', payload));
    payslipEditDialog.close();
    state.payrollRun = data.run;
    state.payrollRunId = data.run.id;
    mergeRunSummary(data.run);
    renderPayrollRuns();
    renderPayrollRun(data.run);
    hidePayslip();
    toast('Payslip updated.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(payslipEditError, err.message);
  } finally {
    setBusy(payslipEditSubmit, false, 'Save payslip', 'Saving…');
  }
});

function payrollDaysFactor() {
  const item = state.editingDaysItem;
  if (!item || !item.periodDays) return 1;
  return Math.min(1, (Number(payrollDaysForm.elements.paidDays.value) || 0) / item.periodDays);
}

function updatePayrollDaysPreview() {
  const item = state.editingDaysItem;
  if (!item || !item.periodDays) {
    $('payroll-days-preview').textContent = '';
    return;
  }
  const monthly = {
    basicSalary: item.monthlyBasic,
    housingAllowance: item.monthlyHousing,
    transportAllowance: item.monthlyTransport,
    otherAllowance: item.monthlyOther,
    otherDeductions: item.otherDeductions,
  };
  const figures = payrollFigures(monthly, payrollDaysFactor());
  const days = Math.max(0, Number(payrollDaysForm.elements.paidDays.value) || 0);
  $('payroll-days-preview').textContent =
    `${days} of ${item.periodDays} days · gross ${money(figures.gross)} · net ${money(figures.net)}`;
}

function openPayrollDays(item) {
  state.editingDaysItem = item;
  payrollDaysForm.reset();
  hideFormError(payrollDaysError);
  clearInvalid(payrollDaysForm);
  const label = state.payrollRun ? state.payrollRun.label : '';
  $('payroll-days-sub').textContent = [item.fullName, item.staffId, label].filter(Boolean).join(' · ');
  const context = item.periodDays
    ? `${item.periodDays} working days in the month; employed for ${item.employedDays}.`
    : 'This payslip has no working-day details. Delete the run and create it again.';
  $('payroll-days-context').textContent = item.prorationNote ? `${context} ${item.prorationNote}.` : context;
  const input = payrollDaysForm.elements.paidDays;
  input.max = String(item.employedDays || 0);
  input.value = String(item.paidDays || 0);
  updatePayrollDaysPreview();
  payrollDaysDialog.showModal();
}

payrollDaysForm.addEventListener('input', (event) => {
  if (event.target.matches('input')) markInvalid(event.target, false);
  updatePayrollDaysPreview();
});

payrollDaysDialog.addEventListener('close', () => {
  state.editingDaysItem = null;
});

payrollDaysForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(payrollDaysError);
  const item = state.editingDaysItem;
  if (!item) return;

  const days = Number(payrollDaysForm.elements.paidDays.value);
  if (!item.periodDays) {
    showFormError(payrollDaysError, 'This payslip has no working-day details. Delete the run and create it again.');
    return;
  }
  if (!Number.isInteger(days) || days < 0 || days > item.employedDays) {
    markInvalid(payrollDaysForm.elements.paidDays, true);
    showFormError(payrollDaysError, `Days paid must be a whole number between 0 and ${item.employedDays}.`);
    return;
  }

  setBusy(payrollDaysSubmit, true, 'Save days', 'Saving…');
  try {
    const data = await api(`/api/payroll/items/${item.id}`, jsonRequest('PATCH', { paidDays: days }));
    payrollDaysDialog.close();
    state.payrollRun = data.run;
    state.payrollRunId = data.run.id;
    mergeRunSummary(data.run);
    renderPayrollRuns();
    renderPayrollRun(data.run);
    hidePayslip();
    toast(`${item.fullName}: paid for ${days} of ${item.periodDays} working days.`);
  } catch (err) {
    if (err.status === 401) return;
    showFormError(payrollDaysError, err.message);
  } finally {
    setBusy(payrollDaysSubmit, false, 'Save days', 'Saving…');
  }
});

function payslipSection(title, rows) {
  const section = el('section', 'payslip-section');
  section.append(el('h3', null, title));
  const table = el('table', 'payslip-table');
  for (const [label, value, strong] of rows) {
    const row = document.createElement('tr');
    if (strong) row.className = 'payslip-strong';
    row.append(el('td', null, label));
    row.append(el('td', 'payslip-amount', typeof value === 'string' ? value : money(value)));
    table.append(row);
  }
  section.append(table);
  return section;
}

function renderPayslip(data) {
  const sheet = $('payslip-sheet');
  sheet.replaceChildren();
  const { company, run, item, employee } = data;

  const head = el('header', 'payslip-head');
  const brand = el('div', 'payslip-brand');
  brand.append(el('h2', null, company));
  brand.append(el('p', null, 'Payslip'));
  const period = el('div', 'payslip-period');
  period.append(el('strong', null, run.label));
  period.append(payrollStatusPill(run.status));
  head.append(brand, period);

  const meta = el('div', 'payslip-meta');
  const details = [
    ['Employee', item.fullName],
    ['Staff ID', item.staffId],
    ['Job title', employee.position || '—'],
    ['Department', employee.department || '—'],
  ];
  if (item.periodDays) {
    details.push(['Days paid', `${item.paidDays} of ${item.periodDays} working days`]);
  }
  details.push(
    ['SSNIT number', employee.ssnitNumber || '—'],
    ['Bank', employee.bankName || '—'],
    ['Account number', employee.accountNumber || '—'],
    ['Gross pay', money(item.gross)]
  );
  for (const [label, value] of details) {
    const block = el('div', 'payslip-meta-item');
    block.append(el('span', null, label));
    block.append(el('strong', null, value));
    meta.append(block);
  }

  const columns = el('div', 'payslip-columns');
  columns.append(payslipSection('Earnings (GHS)', [
    ['Basic salary', item.basicSalary],
    ['Housing allowance', item.housingAllowance],
    ['Transport allowance', item.transportAllowance],
    ['Other allowance', item.otherAllowance],
    ['Gross pay', money(item.gross), true],
  ]));
  const deductions = [
    ['SSNIT employee', item.ssnitEmployee],
    ['PAYE', item.paye],
    ['Other deductions', item.otherDeductions],
  ];
  if (item.otherDeductionNote) {
    deductions[2][0] = `Other deductions — ${item.otherDeductionNote}`;
  }
  const totalDeductions = roundMoney(item.ssnitEmployee + item.paye + item.otherDeductions);
  deductions.push(['Total deductions', money(totalDeductions), true]);
  columns.append(payslipSection('Deductions (GHS)', deductions));

  const net = el('div', 'payslip-net');
  net.append(el('span', null, 'Net pay'));
  net.append(el('strong', null, money(item.net)));

  const footParts = [`Employer SSNIT contribution: ${money(item.ssnitEmployer)}`];
  if (item.periodDays && item.paidDays < item.periodDays) {
    footParts.push(`Basic and allowances prorated to ${item.paidDays} of ${item.periodDays} working days`);
  }
  if (item.prorationNote) footParts.push(item.prorationNote);
  footParts.push(`Prepared ${formatDate(todayISO())}`, company);
  const foot = el('p', 'payslip-foot', footParts.join(' · '));

  sheet.append(head, meta, columns, net, foot);
}

async function openPayslip(itemId) {
  try {
    const data = await api(`/api/payroll/items/${itemId}`);
    state.payslip = data;
    renderPayslip(data);
    $('payslip-wrap').hidden = false;
    $('payslip-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (err.status === 401) return;
    toast(err.message);
  }
}

function hidePayslip() {
  state.payslip = null;
  $('payslip-wrap').hidden = true;
  $('payslip-sheet').replaceChildren();
}

$('payslip-print-btn').addEventListener('click', () => window.print());
$('payslip-close-btn').addEventListener('click', hidePayslip);

/* ---------- Leave ---------- */

const LEAVE_TYPE_NAMES = [
  'Annual', 'Sick', 'Maternity', 'Paternity', 'Study', 'Unpaid', 'Compassionate',
];

function workingDaysBetween(startOn, endOn) {
  const start = Date.parse(`${startOn}T00:00:00Z`);
  const end = Date.parse(`${endOn}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  let days = 0;
  for (let stamp = start; stamp <= end; stamp += 86400000) {
    const weekday = new Date(stamp).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

function dayCount(value) {
  const days = Number(value) || 0;
  return `${days} ${plural(days, 'day', 'days')}`;
}

function leaveStatusPill(status) {
  const className = status === 'Approved' ? 'pill-active' : status === 'Rejected' ? 'pill-inactive' : 'pill-draft';
  return el('span', `pill ${className}`, status);
}

function headsDepartment(department) {
  if (!isHead()) return false;
  return state.departments.some(
    (row) => row.name.toLowerCase() === String(department).toLowerCase() && row.headEmployeeId === state.user.employeeId
  );
}

function fillLeaveYears() {
  const select = $('leave-year');
  const current = new Date().getFullYear();
  const years = new Set([String(state.leaveYear)]);
  for (let year = current - 2; year <= current + 1; year += 1) years.add(String(year));
  for (const item of state.leaveRequests) {
    const year = String(item.startOn || '').slice(0, 4);
    if (/^\d{4}$/.test(year)) years.add(year);
  }
  select.replaceChildren();
  for (const year of [...years].sort((a, b) => Number(b) - Number(a))) {
    select.append(option(year, year));
  }
  select.value = state.leaveYear;
}

function renderLeaveBalance(balance) {
  const strip = $('leave-balance-strip');
  if (!balance) {
    strip.hidden = true;
    strip.replaceChildren();
    return;
  }
  const tiles = [
    [`Entitlement ${balance.year}`, balance.entitlement === null ? 'Not set' : dayCount(balance.entitlement)],
    ['Carried in', dayCount(balance.opening)],
    ['Approved taken', dayCount(balance.taken)],
    ['Pending', dayCount(balance.pending)],
    ['Remaining', balance.remaining === null ? '—' : dayCount(balance.remaining)],
  ];
  strip.replaceChildren();
  for (const [label, value] of tiles) {
    const tile = el('div', 'payroll-tile');
    tile.append(el('span', 'payroll-tile-label', label));
    tile.append(el('strong', 'payroll-tile-value', value));
    strip.append(tile);
  }
  strip.hidden = false;
}

function leaveActionButtons(request) {
  const buttons = [];
  const add = (label, mode, danger) => {
    const button = el('button', `btn-link${danger ? ' danger' : ''}`, label);
    button.type = 'button';
    button.addEventListener('click', () => openLeaveDecision(mode, request));
    buttons.push(button);
  };

  if (request.status === 'Pending head' && headsDepartment(request.department)) {
    add('Recommend', 'recommend');
    add('Decline', 'reject', true);
  } else if (request.status === 'Pending HR' && isHr()) {
    add(request.gmRequired ? 'Preapprove' : 'Approve', 'confirm');
    add('Decline', 'reject', true);
  } else if (request.status === 'Pending GM' && isGm()) {
    add('Final approve', 'confirm');
    add('Decline', 'reject', true);
  }
  return buttons;
}

function renderLeave() {
  const body = $('leave-body');
  body.replaceChildren();
  const requests = state.leaveRequests;

  const pendingHead = requests.filter((item) => item.status === 'Pending head').length;
  const pendingHr = requests.filter((item) => item.status === 'Pending HR').length;
  const pendingGm = requests.filter((item) => item.status === 'Pending GM').length;
  const approved = requests.filter((item) => item.status === 'Approved').length;
  $('leave-sub').textContent = requests.length
    ? `${requests.length} ${plural(requests.length, 'request', 'requests')} in ${state.leaveYear} · ` +
      `${pendingHead} awaiting head · ${pendingHr} awaiting HR · ${pendingGm} awaiting GM · ${approved} approved`
    : `No leave requests in ${state.leaveYear}.`;

  $('leave-table').hidden = requests.length === 0;
  $('leave-empty').hidden = requests.length > 0;
  $('leave-empty-text').textContent = isGm()
    ? `No HOD leave requests in ${state.leaveYear}.`
    : isEmployee()
      ? `You have no leave requests in ${state.leaveYear}.`
      : isDepartmentViewer()
        ? `No requests from your department in ${state.leaveYear}.`
        : `No leave requests in ${state.leaveYear}.`;

  for (const request of requests) {
    const row = document.createElement('tr');

    const nameCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', request.fullName));
    stack.append(el('span', 'cell-sub', request.staffId));
    if (request.requestedByName) {
      stack.append(el('span', 'cell-sub', `Applied by ${request.requestedByName}`));
    }
    nameCell.append(stack);
    row.append(nameCell);

    row.append(el('td', null, request.department || '—'));
    row.append(el('td', null, request.leaveType));

    const dates = el('td', 'leave-dates', `${formatDate(request.startOn)} to ${formatDate(request.endOn)}`);
    row.append(dates);

    row.append(el('td', 'num', String(request.workingDays)));

    const headCell = el('td');
    const headStack = el('div', 'cell-stack');
    headStack.append(el('span', null, request.headName || 'No head assigned'));
    if (request.gmRequired) {
      headStack.append(el('span', 'cell-sub', 'HOD stage skipped'));
    } else if (request.requestedByRole === 'head') {
      headStack.append(el('span', 'cell-sub', 'Applied by HOD · head stage skipped'));
    }
    if (request.headByName) {
      const rejectedByHead = request.status === 'Rejected' && !request.hrDecidedAt && !request.gmDecidedAt;
      headStack.append(el('span', 'cell-sub',
        `${rejectedByHead ? 'Declined' : 'Recommended'} by ${request.headByName} · ${formatStamp(request.headDecidedAt)}`));
    }
    if (request.headNote) headStack.append(el('span', 'leave-note', request.headNote));
    headCell.append(headStack);
    row.append(headCell);

    const statusCell = el('td');
    const statusStack = el('div', 'cell-stack');
    statusStack.append(leaveStatusPill(request.status));
    if (request.hrDecidedAt) {
      const preapproved = request.gmRequired && (request.gmDecidedAt || request.status === 'Pending GM');
      const label = preapproved ? 'Preapproved' : request.status === 'Rejected' ? 'Declined' : 'Approved';
      statusStack.append(el('span', 'cell-sub',
        `${label} by ${request.hrByName || 'HR'} · ${formatStamp(request.hrDecidedAt)}`));
      if (request.hrNote) statusStack.append(el('span', 'leave-note', request.hrNote));
    }
    if (request.gmDecidedAt) {
      statusStack.append(el('span', 'cell-sub',
        `${request.status === 'Rejected' ? 'Declined' : 'Final approval'} by ${request.gmByName || 'General manager'} · ` +
        formatStamp(request.gmDecidedAt)));
      if (request.gmNote) statusStack.append(el('span', 'leave-note', request.gmNote));
    }
    if (request.decidedAt && !request.headDecidedAt && !request.hrDecidedAt && !request.gmDecidedAt) {
      statusStack.append(el('span', 'cell-sub',
        `${request.status} by ${request.decidedByName || 'HR'} · ${formatStamp(request.decidedAt)}`));
      if (request.decisionNote) statusStack.append(el('span', 'leave-note', request.decisionNote));
    }
    statusCell.append(statusStack);
    row.append(statusCell);

    const actions = el('td', 'actions-cell');
    const buttons = leaveActionButtons(request);
    if (!buttons.length) actions.append(el('span', 'cell-sub', '—'));
    else actions.append(...buttons);
    row.append(actions);

    if (request.reason) row.title = request.reason;
    body.append(row);
  }
}

async function loadLeaveView() {
  const seq = ++state.leaveSeq;
  if (!isGm()) await Promise.all([ensureDepartments(), ensureEmployees()]);
  const data = await api(`/api/leave?year=${encodeURIComponent(state.leaveYear)}`);
  if (seq !== state.leaveSeq) return;
  state.leaveYear = String(data.year);
  state.leaveRequests = data.requests;
  fillLeaveYears();
  renderLeaveBalance(data.balance);
  renderLeave();
}

$('leave-year').addEventListener('change', () => {
  state.leaveYear = $('leave-year').value;
  loadLeaveView().catch((err) => {
    if (err.status === 401) return;
    toast('Could not load leave for that year.');
  });
});

function fillLeaveEmployeeSelect(selectedId) {
  const select = leaveForm.elements.employeeId;
  select.replaceChildren();
  select.append(option('', 'Choose employee'));
  const employees = [...(state.employees || [])]
    .filter((row) => row.status === 'Active')
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  for (const employee of employees) {
    select.append(option(String(employee.id), `${employee.fullName} (${employee.staffId}) · ${employee.department}`));
  }
  const preferredId = selectedId || (isEmployee() ? state.user.employeeId : null);
  if (preferredId) select.value = String(preferredId);
  select.disabled = isEmployee();
}

function leaveRouteCopy(employeeId) {
  const employee = (state.employees || []).find((row) => Number(row.id) === Number(employeeId));
  if (!employee) return 'The department head recommends first, then HR approves.';
  const department = state.departments.find((row) => row.name.toLowerCase() === String(employee.department).toLowerCase());
  const targetIsHead = Boolean(
    (department && Number(department.headEmployeeId) === Number(employee.id))
    || (isHead() && Number(employee.id) === Number(state.user.employeeId))
  );
  if (targetIsHead) return 'HOD leave goes to HR for preapproval, then the general manager for final approval.';
  if (isHead()) return 'This request goes directly to HR because you are applying for an employee in your department.';
  if (!department || !department.headEmployeeId) {
    return 'No department head is assigned. This request will wait for a HOD before HR can act.';
  }
  return 'The department head recommends first, then HR approves.';
}

function openLeaveDialog() {
  if (!canApplyLeave()) return;
  leaveForm.reset();
  hideFormError(leaveError);
  clearInvalid(leaveForm);
  fillLeaveEmployeeSelect();
  leaveForm.elements.leaveType.value = 'Annual';
  $('leave-dialog-sub').textContent = leaveRouteCopy(leaveForm.elements.employeeId.value);
  $('leave-days-display').textContent = 'Pick start and end dates';
  $('leave-balance-hint').textContent = 'Weekends are skipped; Monday to Friday are counted.';
  leaveDialog.showModal();
  setTimeout(() => {
    const target = leaveForm.elements.employeeId.disabled ? leaveForm.elements.startOn : leaveForm.elements.employeeId;
    target.focus();
  }, 30);
}

$('new-leave-btn').addEventListener('click', openLeaveDialog);

let leavePreviewSeq = 0;

async function updateLeavePreview() {
  const seq = ++leavePreviewSeq;
  const startOn = leaveForm.elements.startOn.value;
  const endOn = leaveForm.elements.endOn.value;
  const employeeId = leaveForm.elements.employeeId.value;
  const leaveType = leaveForm.elements.leaveType.value;
  $('leave-dialog-sub').textContent = leaveRouteCopy(employeeId);

  const days = workingDaysBetween(startOn, endOn);
  $('leave-days-display').textContent = startOn && endOn
    ? days
      ? `${days} working ${plural(days, 'day', 'days')}`
      : 'No working days in that range'
    : 'Pick start and end dates';

  const defaultHint = 'Weekends are skipped; Monday to Friday are counted.';
  if (!employeeId || !/^\d{4}/.test(startOn)) {
    $('leave-balance-hint').textContent = defaultHint;
    return;
  }

  try {
    const data = await api(`/api/leave/balance/${employeeId}?year=${startOn.slice(0, 4)}`);
    if (seq !== leavePreviewSeq) return;
    const balance = data.balance;
    if (!balance || balance.entitlement === null) {
      $('leave-balance-hint').textContent = canEdit()
        ? `${data.employee.fullName} has no leave entitlement set. Set it on the employee record.`
        : `${data.employee.fullName} has no leave entitlement set. Ask HR to set it on the employee record.`;
      return;
    }
    const available = Math.round((balance.remaining - balance.pending) * 10) / 10;
    let text = `${data.employee.fullName}: ${dayCount(balance.remaining)} remaining for ${balance.year} ` +
      `(entitlement ${dayCount(balance.entitlement)}, carried in ${dayCount(balance.opening)}, ` +
      `taken ${dayCount(balance.taken)}, pending ${dayCount(balance.pending)}).`;
    if (leaveType === 'Annual' && days > available) {
      text += ` This request needs ${dayCount(days)} but only ${dayCount(available)} are free.`;
    }
    $('leave-balance-hint').textContent = text;
  } catch (err) {
    if (seq !== leavePreviewSeq) return;
    if (err.status === 401) return;
    $('leave-balance-hint').textContent = defaultHint;
  }
}

leaveForm.addEventListener('input', (event) => {
  if (event.target.matches('input, select, textarea')) markInvalid(event.target, false);
  updateLeavePreview();
});
leaveForm.addEventListener('change', updateLeavePreview);

leaveDialog.addEventListener('close', () => {
  leavePreviewSeq += 1;
});

leaveForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(leaveError);

  const employeeId = Number(leaveForm.elements.employeeId.value);
  const startOn = leaveForm.elements.startOn.value;
  const endOn = leaveForm.elements.endOn.value;
  if (!employeeId) {
    markInvalid(leaveForm.elements.employeeId, true);
    showFormError(leaveError, 'Choose the employee taking leave.');
    return;
  }
  if (!startOn || !endOn) {
    markInvalid(leaveForm.elements.startOn, !startOn);
    markInvalid(leaveForm.elements.endOn, !endOn);
    showFormError(leaveError, 'Choose both the start and end dates.');
    return;
  }
  if (endOn < startOn) {
    markInvalid(leaveForm.elements.endOn, true);
    showFormError(leaveError, 'The end date must be on or after the start date.');
    return;
  }
  if (!workingDaysBetween(startOn, endOn)) {
    showFormError(leaveError, 'That range has no working days. Pick dates that include a Monday to Friday.');
    return;
  }

  setBusy(leaveSubmit, true, 'Submit request', 'Submitting…');
  try {
    const data = await api('/api/leave', jsonRequest('POST', {
      employeeId,
      leaveType: leaveForm.elements.leaveType.value,
      startOn,
      endOn,
      reason: leaveForm.elements.reason.value.trim(),
    }));
    leaveDialog.close();
    state.leaveYear = String(data.request.startOn).slice(0, 4);
    toast(data.request.status === 'Pending head'
      ? `Request sent to the department head for ${data.request.fullName}.`
      : data.request.gmRequired
        ? `Request sent to HR for preapproval, then the general manager, for ${data.request.fullName}.`
        : `Request sent to HR for ${data.request.fullName}.`);
    await loadLeaveView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(leaveError, err.message);
  } finally {
    setBusy(leaveSubmit, false, 'Submit request', 'Submitting…');
  }
});

const LEAVE_DECISION_COPY = {
  recommend: {
    title: 'Recommend leave',
    submit: 'Recommend',
    help: 'The request then goes to HR for final approval.',
  },
  confirm: {
    title: 'Approve leave',
    submit: 'Approve',
    help: 'This approves the request and adds the days to the balance.',
  },
  reject: {
    title: 'Decline leave request',
    submit: 'Decline',
    help: 'The request is closed. The employee can submit new dates.',
  },
};

function leaveDecisionCopy(mode, request) {
  if (mode === 'confirm' && request.status === 'Pending HR' && request.gmRequired) {
    return {
      title: 'Preapprove HOD leave',
      submit: 'Preapprove',
      help: 'HR preapproval sends this request to the general manager for final approval.',
    };
  }
  if (mode === 'confirm' && request.status === 'Pending GM') {
    return {
      title: 'Final HOD leave approval',
      submit: 'Final approve',
      help: 'This is the final decision and adds the days to the leave balance.',
    };
  }
  return LEAVE_DECISION_COPY[mode];
}

function openLeaveDecision(mode, request) {
  const copy = leaveDecisionCopy(mode, request);
  state.leaveDecision = { mode, id: request.id, copy };
  leaveDecisionForm.reset();
  hideFormError(leaveDecisionError);
  clearInvalid(leaveDecisionForm);
  $('leave-decision-title').textContent = copy.title;
  $('leave-decision-sub').textContent =
    `${request.fullName} · ${request.leaveType} · ${formatDate(request.startOn)} to ${formatDate(request.endOn)} · ` +
    `${request.workingDays} working ${plural(request.workingDays, 'day', 'days')}. ${copy.help}`;
  leaveDecisionSubmit.textContent = copy.submit;
  leaveDecisionSubmit.className = mode === 'reject' ? 'btn btn-danger' : 'btn btn-primary';
  leaveDecisionDialog.showModal();
  setTimeout(() => leaveDecisionForm.elements.note.focus(), 30);
}

leaveDecisionDialog.addEventListener('close', () => {
  if (leaveDecisionDialog.open) return;
  state.leaveDecision = null;
});

leaveDecisionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(leaveDecisionError);
  const decision = state.leaveDecision;
  if (!decision) return;
  const copy = decision.copy;

  setBusy(leaveDecisionSubmit, true, copy.submit, 'Saving…');
  try {
    const data = await api(`/api/leave/${decision.id}/${decision.mode}`, jsonRequest('POST', {
      note: leaveDecisionForm.elements.note.value.trim(),
    }));
    leaveDecisionDialog.close();
    const messages = {
      recommend: 'Recommended. Sent to HR for approval.',
      confirm: data.request.status === 'Pending GM'
        ? 'HR preapproved. Sent to the general manager for final approval.'
        : 'Leave approved.',
      reject: 'Leave request declined.',
    };
    toast(messages[decision.mode]);
    await loadLeaveView();
  } catch (err) {
    if (err.status === 401) return;
    showFormError(leaveDecisionError, err.message);
  } finally {
    setBusy(leaveDecisionSubmit, false, copy.submit, 'Saving…');
  }
});

/* ---------- Bank & SSNIT ---------- */

function renderBank() {
  const body = $('bank-body');
  body.replaceChildren();

  const missingBank = state.bankRows.filter((row) => !row.bankName || !row.accountNumber).length;
  const missingSsnit = state.bankRows.filter((row) => !row.ssnitNumber).length;
  $('bank-sub').textContent =
    `${state.bankRows.length} staff · ${missingBank} without bank details · ${missingSsnit} without SSNIT`;

  $('bank-table').hidden = state.bankRows.length === 0;
  $('bank-empty').hidden = state.bankRows.length > 0;

  for (const employee of state.bankRows) {
    const row = document.createElement('tr');
    row.dataset.id = String(employee.id);

    row.append(el('td', 'staff-id', employee.staffId));
    row.append(el('td', 'name', employee.fullName));
    row.append(el('td', 'department', employee.department));
    row.append(el('td', employee.bankName ? null : 'muted', employee.bankName || 'Not added'));
    row.append(el('td', null, employee.bankBranch || '—'));
    row.append(el('td', null, employee.accountName || '—'));
    row.append(el('td', 'mono', employee.accountNumber || '—'));
    row.append(el('td', 'mono', employee.ssnitNumber || '—'));

    const actions = el('td', 'actions-cell');
    const edit = el('button', 'btn-link', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => openBankDialog(employee));
    actions.append(edit);
    if (!canEdit()) actions.replaceChildren(el('span', 'muted', '—'));

    row.append(actions);
    body.appendChild(row);
  }
}

async function loadBankView() {
  const seq = ++state.bankSeq;
  const data = await api('/api/bank');
  if (seq !== state.bankSeq) return;
  state.bankRows = data.employees;
  renderBank();
}

function openBankDialog(employee) {
  state.bankEmployeeId = employee.id;
  bankForm.reset();
  hideFormError(bankError);
  clearInvalid(bankForm);
  $('bank-dialog-sub').textContent = `${employee.fullName} · ${employee.staffId}`;
  bankForm.elements.bankName.value = employee.bankName;
  bankForm.elements.bankBranch.value = employee.bankBranch;
  bankForm.elements.accountName.value = employee.accountName;
  bankForm.elements.accountNumber.value = employee.accountNumber;
  bankForm.elements.ssnitNumber.value = employee.ssnitNumber;
  bankDialog.showModal();
  setTimeout(() => bankForm.elements.bankName.focus(), 30);
}

bankForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(bankError);

  const values = Object.fromEntries(new FormData(bankForm));
  const payload = {
    bankName: String(values.bankName || '').trim(),
    bankBranch: String(values.bankBranch || '').trim(),
    accountName: String(values.accountName || '').trim(),
    accountNumber: String(values.accountNumber || '').replace(/\s+/g, ''),
    ssnitNumber: String(values.ssnitNumber || '').trim().toUpperCase(),
  };

  if (payload.accountNumber && !/^\d{6,20}$/.test(payload.accountNumber)) {
    markInvalid(bankForm.elements.accountNumber, true);
    showFormError(bankError, 'Account number must be 6 to 20 digits.');
    return;
  }
  if (payload.ssnitNumber && !/^[A-Z]\d{10}$/.test(payload.ssnitNumber)) {
    markInvalid(bankForm.elements.ssnitNumber, true);
    showFormError(bankError, 'SSNIT number must be a letter followed by 10 digits, for example C1234567890.');
    return;
  }

  setBusy(bankSubmit, true, 'Save details', 'Saving…');
  try {
    const data = await api(`/api/employees/${state.bankEmployeeId}/bank`, jsonRequest('PUT', payload));
    state.bankRows = state.bankRows.map((row) => (row.id === data.employee.id ? data.employee : row));
    renderBank();
    bankDialog.close();
    toast('Bank details saved.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(bankError, err.message);
  } finally {
    setBusy(bankSubmit, false, 'Save details', 'Saving…');
  }
});

/* ---------- Users & roles ---------- */

async function loadUsersView() {
  const data = await api('/api/users');
  state.users = data.users;
  renderUsers();
}

function renderUsers() {
  const body = $('users-body');
  body.replaceChildren();

  const active = state.users.filter((user) => user.active).length;
  $('users-sub').textContent =
    `${state.users.length} ${plural(state.users.length, 'account', 'accounts')} · ` +
    `${active} active · ${state.users.length - active} inactive`;
  $('users-table').hidden = state.users.length === 0;
  $('users-empty').hidden = state.users.length > 0;

  for (const user of state.users) {
    const row = document.createElement('tr');
    const self = state.user && state.user.id === user.id;

    const nameCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', user.displayName || user.username));
    if (self) stack.append(el('span', 'cell-sub', 'You'));
    if (user.employeeName) {
      stack.append(el('span', 'cell-sub', `Linked to ${user.employeeName}${user.employeeDepartment ? ` · ${user.employeeDepartment}` : ''}`));
    }
    if (user.departmentName) {
      stack.append(el('span', 'cell-sub', `Assigned to ${user.departmentName}`));
    }
    nameCell.append(stack);
    row.append(nameCell);

    row.append(el('td', 'mono', user.username));

    const roleCell = el('td');
    roleCell.append(el('span', `role-pill role-${user.role}`, roleLabel(user.role)));
    row.append(roleCell);

    const statusCell = el('td');
    statusCell.append(
      el('span', `pill ${user.active ? 'pill-active' : 'pill-inactive'}`, user.active ? 'Active' : 'Deactivated')
    );
    row.append(statusCell);

    row.append(el('td', null, user.lastLoginAt ? formatStamp(user.lastLoginAt) : 'Never'));

    const actions = el('td', 'actions-cell');
    const edit = el('button', 'btn-link', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', () => openUserDialog(user));

    const reset = el('button', 'btn-link', 'Reset password');
    reset.type = 'button';
    reset.disabled = !user.active;
    reset.addEventListener('click', () => openUserPasswordDialog(user));

    const toggle = el('button', 'btn-link danger', user.active ? 'Deactivate' : 'Reactivate');
    toggle.type = 'button';
    toggle.disabled = self;
    if (self) toggle.title = 'You cannot deactivate your own account.';
    toggle.addEventListener('click', () => toggleUserActive(user));

    actions.append(edit, reset, toggle);
    row.append(actions);

    body.appendChild(row);
  }
}

function fillUserEmployeeSelect(selectedId) {
  const select = userForm.elements.employeeId;
  select.replaceChildren();
  select.append(option('', 'Not linked'));
  const employees = [...(state.employees || [])]
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  for (const employee of employees) {
    select.append(option(String(employee.id), `${employee.fullName} (${employee.staffId}) · ${employee.department}`));
  }
  if (selectedId) select.value = String(selectedId);
}

function fillUserDepartmentSelect(selectedId) {
  const select = userForm.elements.departmentId;
  select.replaceChildren();
  select.append(option('', 'Choose a department'));
  const departments = [...selectableDepartments()]
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const department of departments) {
    select.append(option(String(department.id), department.name));
  }
  if (selectedId) select.value = String(selectedId);
}

async function openUserDialog(user = null) {
  state.editingUserId = user ? user.id : null;
  userForm.reset();
  hideFormError(userError);
  clearInvalid(userForm);
  try {
    await Promise.all([ensureEmployees(), ensureDepartments()]);
  } catch (err) {
    if (err.status === 401) return;
    toast('Could not load account options. Check the connection.');
    return;
  }

  const editing = Boolean(user);
  $('user-dialog-title').textContent = editing ? 'Edit user' : 'Add user';
  $('user-dialog-sub').textContent = editing
    ? `${user.displayName || user.username} · @${user.username}`
    : 'Create an account and assign a role.';
  userSubmit.textContent = editing ? 'Save changes' : 'Add user';

  userForm.elements.displayName.value = user ? user.displayName : '';
  userForm.elements.username.value = user ? user.username : '';
  userForm.elements.username.disabled = editing;
  $('user-username-hint').hidden = editing;
  userForm.elements.role.value = user ? user.role : 'hr';
  fillUserEmployeeSelect(user ? user.employeeId : '');
  fillUserDepartmentSelect(user ? user.departmentId : '');
  syncUserEmployeeHint();

  $('user-password-field').hidden = editing;
  userForm.elements.password.required = !editing;
  if (editing) userForm.elements.password.value = '';

  $('user-active-field').hidden = !editing;
  userForm.elements.active.checked = editing ? user.active : true;
  userForm.elements.active.disabled = editing && state.user && state.user.id === user.id;

  userDialog.showModal();
  setTimeout(() => userForm.elements.displayName.focus(), 30);
}

$('add-user-btn').addEventListener('click', () => openUserDialog());

function syncUserEmployeeHint() {
  const role = userForm.elements.role.value;
  const requiresEmployee = role === 'head' || role === 'employee';
  $('user-employee-hint').textContent = requiresEmployee
    ? `A ${role === 'head' ? 'department head' : 'employee'} account must be linked to an employee.`
    : 'Optional — links this account to a staff record.';
  userForm.elements.employeeId.required = requiresEmployee;
  $('user-department-field').hidden = role !== 'supervisor';
  userForm.elements.departmentId.required = role === 'supervisor';
}

userForm.elements.role.addEventListener('change', () => {
  markInvalid(userForm.elements.employeeId, false);
  markInvalid(userForm.elements.departmentId, false);
  syncUserEmployeeHint();
});

userDialog.addEventListener('close', () => {
  if (userDialog.open) return;
  state.editingUserId = null;
});

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(userError);

  const editingId = state.editingUserId;
  const values = Object.fromEntries(new FormData(userForm));
  const payload = {
    displayName: String(values.displayName || '').trim(),
    role: String(values.role || ''),
    active: userForm.elements.active.checked,
    employeeId: values.employeeId ? Number(values.employeeId) : null,
    departmentId: values.role === 'supervisor' && values.departmentId ? Number(values.departmentId) : null,
  };
  if (!editingId) {
    payload.username = String(values.username || '').trim().toLowerCase();
    payload.password = String(values.password || '');
  }

  if (!payload.displayName) {
    markInvalid(userForm.elements.displayName, true);
    showFormError(userError, 'Enter a full name.');
    userForm.elements.displayName.focus();
    return;
  }
  if (!editingId && !/^[a-z0-9._-]{3,40}$/.test(payload.username)) {
    markInvalid(userForm.elements.username, true);
    showFormError(userError, 'Username must be 3–40 characters: letters, numbers, dots, dashes or underscores.');
    userForm.elements.username.focus();
    return;
  }
  if (!editingId && payload.password.length < 8) {
    markInvalid(userForm.elements.password, true);
    showFormError(userError, 'The password must be at least 8 characters.');
    userForm.elements.password.focus();
    return;
  }
  if (['head', 'employee'].includes(payload.role) && !payload.employeeId) {
    markInvalid(userForm.elements.employeeId, true);
    showFormError(userError, 'Link this account to an employee.');
    userForm.elements.employeeId.focus();
    return;
  }
  if (payload.role === 'supervisor' && !payload.departmentId) {
    markInvalid(userForm.elements.departmentId, true);
    showFormError(userError, 'Assign this supervisor to a department.');
    userForm.elements.departmentId.focus();
    return;
  }

  setBusy(userSubmit, true, editingId ? 'Save changes' : 'Add user', 'Saving…');
  try {
    if (editingId) {
      const data = await api(`/api/users/${editingId}`, jsonRequest('PATCH', {
        displayName: payload.displayName,
        role: payload.role,
        active: payload.active,
        employeeId: payload.employeeId,
        departmentId: payload.departmentId,
      }));
      state.users = state.users.map((row) => (row.id === data.user.id ? data.user : row));
      userDialog.close();
      renderUsers();
      toast('User updated.');
    } else {
      const data = await api('/api/users', jsonRequest('POST', payload));
      state.users = [...state.users, data.user].sort((a, b) => a.username.localeCompare(b.username));
      userDialog.close();
      renderUsers();
      toast('User added.');
    }
  } catch (err) {
    if (err.status === 401) return;
    showFormError(userError, err.message);
  } finally {
    setBusy(userSubmit, false, editingId ? 'Save changes' : 'Add user', 'Saving…');
  }
});

function openUserPasswordDialog(user) {
  state.resetPasswordUserId = user.id;
  userPasswordForm.reset();
  hideFormError(userPasswordError);
  clearInvalid(userPasswordForm);
  $('user-password-sub').textContent = `Set a new password for ${user.displayName || user.username}.`;
  userPasswordDialog.showModal();
  setTimeout(() => userPasswordForm.elements.password.focus(), 30);
}

userPasswordDialog.addEventListener('close', () => {
  if (userPasswordDialog.open) return;
  state.resetPasswordUserId = null;
});

userPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(userPasswordError);

  const values = Object.fromEntries(new FormData(userPasswordForm));
  const password = String(values.password || '');
  if (password.length < 8) {
    markInvalid(userPasswordForm.elements.password, true);
    showFormError(userPasswordError, 'The password must be at least 8 characters.');
    return;
  }
  if (password !== String(values.confirmPassword || '')) {
    markInvalid(userPasswordForm.elements.confirmPassword, true);
    showFormError(userPasswordError, 'The passwords do not match.');
    return;
  }

  const id = state.resetPasswordUserId;
  setBusy(userPasswordSubmit, true, 'Reset password', 'Saving…');
  try {
    await api(`/api/users/${id}/password`, jsonRequest('POST', { password }));
    userPasswordDialog.close();
    toast('Password reset. Existing sessions were signed out.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(userPasswordError, err.message);
  } finally {
    setBusy(userPasswordSubmit, false, 'Reset password', 'Saving…');
  }
});

function toggleUserActive(user) {
  const deactivating = user.active;
  openConfirm({
    title: deactivating ? 'Deactivate account?' : 'Reactivate account?',
    message: deactivating
      ? `${user.displayName || user.username} will be signed out and unable to sign in until reactivated.`
      : `${user.displayName || user.username} will be able to sign in again with their current role.`,
    actionLabel: deactivating ? 'Deactivate' : 'Reactivate',
    busyLabel: 'Saving…',
    action: async () => {
      const data = await api(`/api/users/${user.id}`, jsonRequest('PATCH', { active: !user.active }));
      state.users = state.users.map((row) => (row.id === data.user.id ? data.user : row));
      renderUsers();
      toast(deactivating ? 'Account deactivated.' : 'Account reactivated.');
    },
  });
}

/* ---------- Admin ---------- */

function formatMoment(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function backupLabel(name) {
  if (name.startsWith('hrms-backup-')) return 'Manual backup';
  if (name.startsWith('hrms-before-reset-')) return 'Before data reset';
  if (name.startsWith('pre-restore-')) return 'Before a restore';
  return 'Snapshot';
}

async function loadAdminView() {
  const [backups, users, taxData] = await Promise.all([
    api('/api/admin/backups'),
    api('/api/users'),
    api('/api/payroll/taxes'),
  ]);
  state.backups = backups.backups;
  state.users = users.users;
  state.payrollTaxes = taxData.taxes;
  renderBackups();
  renderAdminRoles();
  renderAdminBranding();
  renderPayrollTaxes();
}

function renderPayrollTaxes() {
  const taxes = state.payrollTaxes;
  payrollTaxesForm.elements.ssnitEmployeeRate.value = String(taxes.ssnitEmployeeRate);
  payrollTaxesForm.elements.ssnitEmployerRate.value = String(taxes.ssnitEmployerRate);
  const body = $('payroll-taxes-body');
  body.replaceChildren();

  taxes.payeBands.forEach((band, index) => {
    const row = document.createElement('tr');
    row.append(el('td', 'num', String(index + 1)));
    const widthCell = el('td');
    if (band.width === null) {
      widthCell.append(el('span', 'muted', 'No limit'));
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.max = '1000000000';
      input.step = '0.01';
      input.value = String(band.width);
      input.dataset.bandWidth = String(index);
      input.setAttribute('aria-label', `PAYE band ${index + 1} width`);
      widthCell.append(input);
    }
    row.append(widthCell);
    const rateCell = el('td');
    const rate = document.createElement('input');
    rate.type = 'number';
    rate.min = '0';
    rate.max = '100';
    rate.step = '0.01';
    rate.value = String(band.rate);
    rate.dataset.bandRate = String(index);
    rate.setAttribute('aria-label', `PAYE band ${index + 1} rate`);
    rateCell.append(rate);
    row.append(rateCell);
    body.append(row);
  });

  hideFormError(payrollTaxesError);
  payrollTaxesStatus.textContent = 'Saved settings apply to new payroll runs. Draft runs are recalculated when you save; approved runs keep their existing figures.';
}

payrollTaxesForm.addEventListener('input', (event) => {
  if (event.target.matches('input')) markInvalid(event.target, false);
  hideFormError(payrollTaxesError);
});

payrollTaxesForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(payrollTaxesError);
  const payeBands = state.payrollTaxes.payeBands.map((band, index) => ({
    width: index === state.payrollTaxes.payeBands.length - 1
      ? null
      : document.querySelector(`[data-band-width="${index}"]`).value,
    rate: document.querySelector(`[data-band-rate="${index}"]`).value,
  }));
  const payload = {
    ssnitEmployeeRate: payrollTaxesForm.elements.ssnitEmployeeRate.value,
    ssnitEmployerRate: payrollTaxesForm.elements.ssnitEmployerRate.value,
    payeBands,
  };

  setBusy(payrollTaxesSubmit, true, 'Save tax settings', 'Saving…');
  try {
    const data = await api('/api/payroll/taxes', jsonRequest('PUT', payload));
    state.payrollTaxes = data.taxes;
    renderPayrollTaxes();
    if (state.payrollRunId) await loadPayrollView();
    payrollTaxesStatus.textContent = `Saved. ${data.recalculatedItems} draft ${plural(data.recalculatedItems, 'payslip was', 'payslips were')} recalculated. Approved runs were not changed.`;
    toast('Payroll tax settings saved.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(payrollTaxesError, err.message);
  } finally {
    setBusy(payrollTaxesSubmit, false, 'Save tax settings', 'Saving…');
  }
});

function renderAdminBranding() {
  $('admin-company-name').textContent = $('brand-company-name').textContent;
  $('admin-logo-preview').src = `/api/logo?v=${Date.now()}`;
}

function renderBackups() {
  const body = $('admin-backups-body');
  body.replaceChildren();
  const backups = state.backups;

  $('admin-backups-table').hidden = backups.length === 0;
  $('admin-backups-empty').hidden = backups.length > 0;
  $('admin-backups-sub').textContent = backups.length
    ? `${backups.length} ${plural(backups.length, 'snapshot', 'snapshots')} · latest ${formatMoment(backups[0].createdAt)}`
    : 'Keep a snapshot before bulk changes or upgrades.';

  for (const backup of backups) {
    const row = document.createElement('tr');

    const nameCell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', backupLabel(backup.name)), el('span', 'cell-sub mono', backup.name));
    nameCell.append(stack);
    row.append(nameCell);

    row.append(el('td', 'mono', formatBytes(backup.size)));
    row.append(el('td', null, formatMoment(backup.createdAt)));

    const actions = el('td', 'actions-cell');
    const download = el('a', 'btn-link', 'Download');
    download.href = `/api/admin/backups/${encodeURIComponent(backup.name)}`;
    download.download = backup.name;

    const restore = el('button', 'btn-link danger', 'Restore');
    restore.type = 'button';
    restore.addEventListener('click', () => restoreBackup(backup));

    actions.append(download, restore);
    row.append(actions);
    body.appendChild(row);
  }
}

function renderAdminRoles() {
  const users = state.users;
  const body = $('admin-roles-body');
  body.replaceChildren();

  const active = users.filter((user) => user.active);
  const admins = active.filter((user) => user.role === 'admin').length;
  const hrUsers = active.filter((user) => user.role === 'hr').length;
  const viewers = active.filter((user) => user.role === 'viewer').length;
  $('admin-roles-sub').textContent =
    `${users.length} ${plural(users.length, 'account', 'accounts')} · ${admins} admin · ${hrUsers} HR · ${viewers} viewer`;

  for (const user of users) {
    const row = document.createElement('tr');
    const cell = el('td');
    const stack = el('div', 'cell-stack');
    stack.append(el('span', 'name', user.displayName || user.username));
    stack.append(el('span', 'cell-sub mono', `@${user.username}`));
    cell.append(stack);
    row.append(cell);

    const roleCell = el('td');
    roleCell.append(el('span', `role-pill role-${user.role}`, roleLabel(user.role)));
    row.append(roleCell);

    const statusCell = el('td');
    statusCell.append(
      el('span', `pill ${user.active ? 'pill-active' : 'pill-inactive'}`, user.active ? 'Active' : 'Deactivated')
    );
    row.append(statusCell);

    body.appendChild(row);
  }
}

function restoreBackup(backup) {
  openConfirm({
    title: 'Restore this backup?',
    message:
      `${backupLabel(backup.name)} from ${formatMoment(backup.createdAt)} replaces every current record. ` +
      'A safety backup is saved first, then everyone is signed out.',
    actionLabel: 'Restore backup',
    busyLabel: 'Restoring…',
    action: async () => {
      await api(`/api/admin/backups/${encodeURIComponent(backup.name)}/restore`, { method: 'POST' });
      toast('Backup restored. Sign in again.');
      setTimeout(() => window.location.replace('/'), 1500);
    },
  });
}

const adminBackupBtn = $('admin-backup-btn');

adminBackupBtn.addEventListener('click', async () => {
  setBusy(adminBackupBtn, true, 'Back up now', 'Saving…');
  try {
    const data = await api('/api/admin/backups', { method: 'POST' });
    state.backups = data.backups;
    renderBackups();
    toast('Backup created.');
  } catch (err) {
    if (err.status === 401) return;
    toast(err.message);
  } finally {
    setBusy(adminBackupBtn, false, 'Back up now', 'Saving…');
  }
});

$('admin-company-btn').addEventListener('click', () => {
  companyForm.reset();
  hideFormError(companyError);
  clearInvalid(companyForm);
  companyForm.elements.companyName.value = $('brand-company-name').textContent;
  companyDialog.showModal();
  setTimeout(() => companyForm.elements.companyName.focus(), 30);
});

companyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(companyError);

  const name = companyForm.elements.companyName.value.replace(/\s+/g, ' ').trim();
  if (name.length < 2) {
    showFormError(companyError, 'Enter a company name of at least 2 characters.');
    return;
  }

  setBusy(companySubmit, true, 'Save name', 'Saving…');
  try {
    const data = await api('/api/branding', jsonRequest('PUT', { companyName: name }));
    renderCompanyName(data.companyName);
    companyDialog.close();
    toast('Company name updated.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(companyError, err.message);
  } finally {
    setBusy(companySubmit, false, 'Save name', 'Saving…');
  }
});

$('admin-logo-btn').addEventListener('click', openLogoDialog);

/* ---------- Form helpers ---------- */

function setBusy(button, busy, idleLabel, busyLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

function showFormError(box, message) {
  box.textContent = message;
  box.hidden = false;
}

function hideFormError(box) {
  box.hidden = true;
  box.textContent = '';
}

function markInvalid(input, invalid) {
  if (!input) return;
  const field = input.closest('.field');
  if (field) field.classList.toggle('invalid', invalid);
}

function clearInvalid(form) {
  form.querySelectorAll('.field.invalid').forEach((field) => field.classList.remove('invalid'));
}

for (const form of [departmentForm, bankForm, passwordForm, trainingForm, healthForm, expatForm, reminderForm, payrollForm]) {
  form.addEventListener('input', (event) => {
    if (event.target.matches('input, select, textarea')) markInvalid(event.target, false);
  });
}

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => {
    const dialog = button.closest('dialog');
    if (dialog) dialog.close();
  });
});

function renderBankDatalist() {
  const list = $('bank-options');
  list.replaceChildren();
  for (const name of BANKS) {
    const optionNode = document.createElement('option');
    optionNode.value = name;
    list.appendChild(optionNode);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/* ---------- Shell preferences and branding ---------- */

const themeToggle = $('theme-toggle');
const sidebarToggle = $('sidebar-toggle');
const brandCompanyBtn = $('brand-company-btn');
const brandCompanyInput = $('brand-company-input');

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preferences still apply for this session */
  }
}

function setTheme(theme, persist = true) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  const next = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
  themeToggle.title = `Switch to ${next} theme`;
  if (persist) savePreference('hrms-theme', theme);
}

function setSidebarCollapsed(collapsed, persist = true) {
  document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  sidebarToggle.setAttribute('aria-label', label);
  sidebarToggle.title = label;
  if (persist) savePreference('hrms-sidebar', collapsed ? 'collapsed' : 'expanded');
}

themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(!document.documentElement.classList.contains('sidebar-collapsed'));
});

function renderCompanyName(name) {
  const value = String(name || '').trim() || 'Docker HRMS';
  $('brand-company-name').textContent = value;
  brandCompanyBtn.title = isAdmin() ? 'Change company name' : value;
  if ($('admin-company-name')) $('admin-company-name').textContent = value;
}

function startCompanyEdit() {
  if (!isAdmin()) return;
  brandCompanyInput.value = $('brand-company-name').textContent;
  brandCompanyBtn.hidden = true;
  brandCompanyInput.hidden = false;
  brandCompanyInput.focus();
  brandCompanyInput.select();
}

function stopCompanyEdit() {
  brandCompanyInput.hidden = true;
  brandCompanyBtn.hidden = false;
}

let companySaving = false;

async function saveCompanyName() {
  if (companySaving) return;
  const name = brandCompanyInput.value.replace(/\s+/g, ' ').trim();
  if (name.length < 2) {
    toast('Enter a company name of at least 2 characters.');
    brandCompanyInput.focus();
    return;
  }
  if (name === $('brand-company-name').textContent) {
    stopCompanyEdit();
    return;
  }

  companySaving = true;
  try {
    const data = await api('/api/branding', jsonRequest('PUT', { companyName: name }));
    renderCompanyName(data.companyName);
    stopCompanyEdit();
    toast('Company name updated.');
  } catch (err) {
    if (err.status === 401) return;
    toast(err.message);
  } finally {
    companySaving = false;
  }
}

brandCompanyBtn.addEventListener('click', startCompanyEdit);

brandCompanyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveCompanyName();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    stopCompanyEdit();
    brandCompanyBtn.focus();
  }
});

brandCompanyInput.addEventListener('blur', () => {
  if (!brandCompanyInput.hidden) stopCompanyEdit();
});

/* ---------- Logo and password ---------- */

function openLogoDialog() {
  setMenu(false);
  logoForm.reset();
  hideFormError(logoError);
  logoPreview.src = `/api/logo?v=${Date.now()}`;
  logoDialog.showModal();
}

function validateLogoFile(file) {
  if (!file) return 'Choose an image first.';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return 'Choose a PNG, JPG or WebP image.';
  }
  if (file.size > 1.5 * 1024 * 1024) return 'The image must be 1.5 MB or smaller.';
  return null;
}

logoFile.addEventListener('change', async () => {
  const file = logoFile.files[0];
  const problem = validateLogoFile(file);
  if (problem) {
    if (file) {
      showFormError(logoError, problem);
      logoFile.value = '';
    }
    return;
  }
  hideFormError(logoError);
  try {
    logoPreview.src = await readFileAsDataURL(file);
  } catch {
    showFormError(logoError, 'Could not read that image.');
  }
});

logoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(logoError);

  const file = logoFile.files[0];
  const problem = validateLogoFile(file);
  if (problem) {
    showFormError(logoError, problem);
    return;
  }

  setBusy(logoSubmit, true, 'Save logo', 'Saving…');
  try {
    const dataUrl = await readFileAsDataURL(file);
    await api('/api/logo', jsonRequest('POST', { dataUrl }));
    logoDialog.close();
    const version = Date.now();
    document.querySelectorAll('.brand-logo, .logo-preview, .admin-logo').forEach((image) => {
      image.src = `/api/logo?v=${version}`;
    });
    toast('Logo updated.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(logoError, err.message);
  } finally {
    setBusy(logoSubmit, false, 'Save logo', 'Saving…');
  }
});

$('change-password-btn').addEventListener('click', () => {
  setMenu(false);
  passwordForm.reset();
  hideFormError(passwordError);
  clearInvalid(passwordForm);
  passwordDialog.showModal();
  setTimeout(() => passwordForm.elements.currentPassword.focus(), 30);
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormError(passwordError);

  const values = Object.fromEntries(new FormData(passwordForm));
  const currentPassword = String(values.currentPassword || '');
  const newPassword = String(values.newPassword || '');
  const confirmPassword = String(values.confirmPassword || '');

  if (!currentPassword) {
    markInvalid(passwordForm.elements.currentPassword, true);
    showFormError(passwordError, 'Enter your current password.');
    return;
  }
  if (newPassword.length < 8) {
    markInvalid(passwordForm.elements.newPassword, true);
    showFormError(passwordError, 'The new password must be at least 8 characters.');
    return;
  }
  if (newPassword !== confirmPassword) {
    markInvalid(passwordForm.elements.confirmPassword, true);
    showFormError(passwordError, 'The new passwords do not match.');
    return;
  }

  setBusy(passwordSubmit, true, 'Save password', 'Saving…');
  try {
    await api('/api/change-password', jsonRequest('POST', { currentPassword, newPassword }));
    passwordDialog.close();
    toast('Password changed.');
  } catch (err) {
    if (err.status === 401) return;
    showFormError(passwordError, err.message);
  } finally {
    setBusy(passwordSubmit, false, 'Save password', 'Saving…');
  }
});

$('logout-btn').addEventListener('click', async () => {
  setMenu(false);
  try {
    await api('/api/logout', { method: 'POST' });
  } catch {
    /* session may already be gone */
  }
  window.location.replace('/');
});

(async function init() {
  try {
    const [me, branding] = await Promise.all([
      api('/api/me'),
      api('/api/branding').catch(() => ({})),
    ]);
    state.user = me.user;
    if (!['nurse', 'head', 'employee', 'supervisor', 'gm'].includes(me.user.role)) {
      const taxData = await api('/api/payroll/taxes');
      state.payrollTaxes = taxData.taxes;
    }
    renderUser(me.user);
    renderCompanyName(branding.companyName);
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', false);
    setSidebarCollapsed(document.documentElement.classList.contains('sidebar-collapsed'), false);
    for (const link of document.querySelectorAll('.side-link')) {
      const label = link.querySelector('span');
      if (!label) continue;
      link.title = label.textContent;
      link.setAttribute('aria-label', label.textContent);
    }
    renderBankDatalist();
    await renderRoute();
  } catch (err) {
    if (err.status !== 401) toast('Could not load the page. Check the connection.');
  }
})();
