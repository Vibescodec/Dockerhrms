'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.HRMS_PORT) || 3210;
const HOST = process.env.HRMS_HOST || '127.0.0.1';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'hrms.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LOGO_PATH = path.join(DATA_DIR, 'logo.img');
const SESSION_MS = 12 * 60 * 60 * 1000;
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });

let db = new DatabaseSync(DB_PATH);

function createSchema(target) {
  target.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'hr',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    joined_on TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    head_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS units_department_name
    ON units (department_id, name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS training_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed_on TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employee_dependants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dob TEXT
  );

  CREATE TABLE IF NOT EXISTS employee_education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    qualification TEXT,
    year INTEGER
  );

  CREATE TABLE IF NOT EXISTS employee_experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employer TEXT NOT NULL,
    job_title TEXT,
    start_year INTEGER,
    end_year INTEGER
  );

  CREATE TABLE IF NOT EXISTS employee_referees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS employee_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    record_date TEXT NOT NULL,
    notes TEXT,
    filename TEXT,
    mime TEXT,
    size INTEGER,
    data BLOB,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_on TEXT NOT NULL,
    notes TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    head_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    leave_type TEXT NOT NULL,
    start_on TEXT NOT NULL,
    end_on TEXT NOT NULL,
    working_days REAL NOT NULL DEFAULT 0,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending head',
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    head_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    head_note TEXT,
    head_decided_at TEXT,
    decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decided_at TEXT,
    decision_note TEXT
  );

  CREATE TABLE IF NOT EXISTS payroll_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS payroll_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    staff_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    basic_salary REAL NOT NULL DEFAULT 0,
    housing_allowance REAL NOT NULL DEFAULT 0,
    transport_allowance REAL NOT NULL DEFAULT 0,
    other_allowance REAL NOT NULL DEFAULT 0,
    department TEXT,
    position TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    account_name TEXT,
    account_number TEXT,
    ssnit_number TEXT,
    other_deductions REAL NOT NULL DEFAULT 0,
    other_deduction_note TEXT,
    gross REAL NOT NULL DEFAULT 0,
    ssnit_employee REAL NOT NULL DEFAULT 0,
    ssnit_employer REAL NOT NULL DEFAULT 0,
    paye REAL NOT NULL DEFAULT 0,
    net REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

createSchema(db);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

const DEFAULT_COMPANY_NAME = 'Docker HRMS';

function companyName() {
  return getSetting('company.name') || DEFAULT_COMPANY_NAME;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[2], 'hex');
  const candidate = crypto.scryptSync(password, parts[1], expected.length);
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const SEED_EMPLOYEES = [
  ['EMP-001', 'Ayesha Fernando', 'Human Resources', 'HR Manager', 'ayesha.fernando@alienoid.example', '2013-10-07', 'Active'],
  ['EMP-002', 'Ruwan Perera', 'Finance', 'Finance Director', 'ruwan.perera@alienoid.example', '2015-07-20', 'Active'],
  ['EMP-003', 'Nadeesha Silva', 'IT', 'Systems Administrator', 'nadeesha.silva@alienoid.example', '2017-01-09', 'Active'],
  ['EMP-004', 'Kasun Jayawardena', 'Operations', 'Operations Supervisor', 'kasun.jayawardena@alienoid.example', '2016-05-16', 'Active'],
  ['EMP-005', 'Dilani Wickramasinghe', 'Sales', 'Account Executive', 'dilani.w@alienoid.example', '2019-03-04', 'Active'],
  ['EMP-006', 'Mohamed Rizwan', 'Warehouse', 'Warehouse Lead', 'mohamed.rizwan@alienoid.example', '2018-11-12', 'Active'],
  ['EMP-007', 'Chamari Gunasekara', 'Finance', 'Payroll Officer', 'chamari.g@alienoid.example', '2020-08-03', 'Active'],
  ['EMP-008', 'Sahan Weerasinghe', 'IT', 'Software Developer', 'sahan.weerasinghe@alienoid.example', '2021-06-14', 'Active'],
  ['EMP-009', 'Ishara Mendis', 'Human Resources', 'Recruitment Officer', 'ishara.mendis@alienoid.example', '2022-02-07', 'Active'],
  ['EMP-010', 'Tharindu Bandara', 'Operations', 'Logistics Coordinator', 'tharindu.bandara@alienoid.example', '2020-10-19', 'Inactive'],
  ['EMP-011', 'Priyanka Rajapaksa', 'Sales', 'Sales Manager', 'priyanka.rajapaksa@alienoid.example', '2016-09-26', 'Active'],
  ['EMP-012', 'Amila Karunaratne', 'Warehouse', 'Inventory Clerk', 'amila.karunaratne@alienoid.example', '2023-04-11', 'Active'],
  ['EMP-013', 'Fathima Nazeer', 'Finance', 'Accounts Assistant', 'fathima.nazeer@alienoid.example', '2024-01-15', 'Active'],
  ['EMP-014', 'Lahiru Dissanayake', 'IT', 'Helpdesk Technician', 'lahiru.dissanayake@alienoid.example', '2025-09-01', 'Inactive'],
];

const TRAINING_TITLES = [
  'Fire safety', 'First aid at work', 'Data protection', 'Manual handling',
  'Customer care', 'Workplace ethics', 'Health & safety', 'Excel essentials',
  'Time management', 'Anti-harassment', 'Cybersecurity awareness', 'Emergency evacuation',
];

let adminCreated = false;

if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
  db.prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run('admin', hashPassword('Admin@123'), 'System Administrator', 'admin');
  adminCreated = true;
}

if (!getSetting('seeded')) {
  if (db.prepare('SELECT COUNT(*) AS c FROM employees').get().c === 0) {
    const insertEmployee = db.prepare(
      'INSERT INTO employees (staff_id, full_name, department, position, email, joined_on, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const employeeIds = SEED_EMPLOYEES.map((row) => Number(insertEmployee.run(...row).lastInsertRowid));

    const insertTraining = db.prepare(
      'INSERT INTO training_records (employee_id, title, completed_on) VALUES (?, ?, ?)'
    );
    for (let i = 0; i < 38; i += 1) {
      const completedOn = new Date(Date.UTC(2024 + (i % 3), i % 12, ((i * 7) % 27) + 1))
        .toISOString()
        .slice(0, 10);
      insertTraining.run(employeeIds[i % employeeIds.length], TRAINING_TITLES[i % TRAINING_TITLES.length], completedOn);
    }
  }
  setSetting('seeded', '1');
}

function migrateSchema() {
  const ensureColumn = (table, name, definition) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
    if (!columns.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  };

  for (const column of ['unit', 'basic_salary', 'housing_allowance', 'transport_allowance', 'other_allowance']) {
    ensureColumn('employees', column, column === 'unit' ? 'TEXT' : 'REAL');
  }

  ensureColumn('employees', 'bank_name', 'TEXT');
  ensureColumn('employees', 'bank_branch', 'TEXT');
  ensureColumn('employees', 'account_name', 'TEXT');
  ensureColumn('employees', 'account_number', 'TEXT');
  ensureColumn('employees', 'ssnit_number', 'TEXT');

  ensureColumn('employees', 'dob', 'TEXT');
  ensureColumn('employees', 'sex', 'TEXT');
  ensureColumn('employees', 'nationality', 'TEXT');
  ensureColumn('employees', 'marital_status', 'TEXT');
  ensureColumn('employees', 'phone', 'TEXT');
  ensureColumn('employees', 'residential_address', 'TEXT');
  ensureColumn('employees', 'national_id_type', 'TEXT');
  ensureColumn('employees', 'national_id_number', 'TEXT');

  ensureColumn('employees', 'employment_type', 'TEXT');
  ensureColumn('employees', 'contract_end', 'TEXT');
  db.prepare("UPDATE employees SET employment_type = 'Casual' WHERE employment_type = 'Temporary'").run();
  ensureColumn('employees', 'probation_end', 'TEXT');
  ensureColumn('employees', 'leave_entitlement', 'REAL');
  ensureColumn('employees', 'leave_taken', 'REAL');
  ensureColumn('employees', 'leave_start', 'TEXT');
  ensureColumn('employees', 'leave_end', 'TEXT');
  ensureColumn('employees', 'leave_type', 'TEXT');

  ensureColumn('employees', 'father_name', 'TEXT');
  ensureColumn('employees', 'father_contact', 'TEXT');
  ensureColumn('employees', 'mother_name', 'TEXT');
  ensureColumn('employees', 'mother_contact', 'TEXT');
  ensureColumn('employees', 'spouse_name', 'TEXT');
  ensureColumn('employees', 'spouse_contact', 'TEXT');
  ensureColumn('employees', 'next_of_kin_name', 'TEXT');
  ensureColumn('employees', 'next_of_kin_relationship', 'TEXT');
  ensureColumn('employees', 'next_of_kin_contact', 'TEXT');
  ensureColumn('employees', 'emergency_name', 'TEXT');
  ensureColumn('employees', 'emergency_relationship', 'TEXT');
  ensureColumn('employees', 'emergency_contact', 'TEXT');

  ensureColumn('employees', 'tin_number', 'TEXT');
  ensureColumn('employees', 'blood_group', 'TEXT');
  ensureColumn('employees', 'allergies', 'TEXT');
  ensureColumn('employees', 'medical_conditions', 'TEXT');

  ensureColumn('employees', 'photo_mime', 'TEXT');
  ensureColumn('employees', 'photo_data', 'BLOB');

  ensureColumn('employees', 'is_expatriate', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('employees', 'passport_number', 'TEXT');
  ensureColumn('employees', 'passport_expiry', 'TEXT');
  ensureColumn('employees', 'work_permit_number', 'TEXT');
  ensureColumn('employees', 'work_permit_expiry', 'TEXT');
  ensureColumn('employees', 'has_accommodation', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('employees', 'accommodation_details', 'TEXT');
  ensureColumn('employees', 'updated_at', 'TEXT');

  ensureColumn('training_records', 'duration', 'TEXT');
  ensureColumn('training_records', 'facilitator', 'TEXT');
  ensureColumn('training_records', 'venue', 'TEXT');
  ensureColumn('training_records', 'score', 'REAL');
  ensureColumn('training_records', 'certificate_issued', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('training_records', 'remarks', 'TEXT');

  ensureColumn('users', 'active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'last_login_at', 'TEXT');
  ensureColumn('users', 'updated_at', 'TEXT');
  ensureColumn('users', 'employee_id', 'INTEGER');

  for (const column of ['department', 'position', 'bank_name', 'bank_branch', 'account_name', 'account_number', 'ssnit_number']) {
    ensureColumn('payroll_items', column, 'TEXT');
  }

  ensureColumn('employees', 'leave_opening', 'REAL NOT NULL DEFAULT 0');
  if (!getSetting('leave_opening_migrated')) {
    db.prepare('UPDATE employees SET leave_opening = COALESCE(leave_taken, 0)').run();
    setSetting('leave_opening_migrated', '1');
  }
}

migrateSchema();

if (!getSetting('team_accounts_seeded')) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
  );
  if (!db.prepare('SELECT id FROM users WHERE username = ?').get('hr.user')) {
    insertUser.run('hr.user', hashPassword('Hr@12345'), 'Akosua Mensah', 'hr');
  }
  if (!db.prepare('SELECT id FROM users WHERE username = ?').get('viewer.user')) {
    insertUser.run('viewer.user', hashPassword('Viewer@123'), 'Kwame Asante', 'viewer');
  }
  setSetting('team_accounts_seeded', '1');
}

if (db.prepare('SELECT COUNT(*) AS c FROM departments').get().c === 0) {
  const names = db.prepare('SELECT DISTINCT department AS name FROM employees ORDER BY department COLLATE NOCASE').all();
  const insertDepartment = db.prepare('INSERT INTO departments (name, head_employee_id) VALUES (?, ?)');
  for (const row of names) {
    const head = db.prepare(
      "SELECT id FROM employees WHERE department = ? AND status = 'Active' ORDER BY joined_on ASC, id ASC LIMIT 1"
    ).get(row.name);
    insertDepartment.run(row.name, head ? Number(head.id) : null);
  }
}

db.prepare(
  `DELETE FROM departments
    WHERE system = 1
      AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.department = departments.name)`
).run();

function dayOffset(days) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

if (!getSetting('profile_seeded')) {
  const offsetDays = [3, 8, 15, 23, 38, 55, 74, 92, 121, 149, 176, 205, 244, 281, 318, 347];
  const streets = [
    '12 Ridge Road, Accra', '45 Spintex Road, Accra', '8 Liberation Close, East Legon',
    '27 Adenta Housing Down, Accra', '19 Achimota Road, Accra', '3 Giffard Road, Cantonments',
    '61 Haatso Road, Accra', '14 Tesano Close, Accra',
  ];
  const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'O+'];
  const education = [
    ['University of Ghana', 'BSc Business Administration'],
    ['University of Cape Coast', 'BA Human Resource Management'],
    ['Kwame Nkrumah University of Science and Technology', 'BSc Computer Science'],
    ['Ghana Institute of Management and Public Administration', 'MBA Finance'],
    ['Accra Technical University', 'HND Accounting'],
    ['University of Education, Winneba', 'BEd Management'],
  ];
  const previousRoles = [
    ['Cedar Logistics', 'Administrative Assistant'],
    ['Meridian Systems', 'Accounts Assistant'],
    ['Accra Retail Group', 'Operations Assistant'],
    ['Golden Gate Services', 'Sales Assistant'],
    ['Harbour Point Ltd', 'Office Administrator'],
  ];
  const dependantFirst = ['Dinuka', 'Sachini', 'Kavindu', 'Tharushi', 'Akhil', 'Nethmi'];
  const refereeFirst = ['Anura', 'Grace', 'Mohan', 'Adwoa', 'Ravi', 'Linda'];

  const rows = db.prepare(
    "SELECT id, full_name, joined_on FROM employees WHERE dob IS NULL AND staff_id <> 'EMP-015' ORDER BY id"
  ).all();

  const update = db.prepare(
    `UPDATE employees SET
       dob = ?, sex = ?, nationality = ?, marital_status = ?, phone = ?, residential_address = ?,
       national_id_type = ?, national_id_number = ?, employment_type = ?, probation_end = ?, contract_end = ?,
       leave_entitlement = ?, leave_taken = ?, leave_start = ?, leave_end = ?, leave_type = ?,
       father_name = ?, father_contact = ?, mother_name = ?, mother_contact = ?, spouse_name = ?, spouse_contact = ?,
       next_of_kin_name = ?, next_of_kin_relationship = ?, next_of_kin_contact = ?,
       emergency_name = ?, emergency_relationship = ?, emergency_contact = ?,
       blood_group = ?, allergies = ?, medical_conditions = ?, tin_number = ?, updated_at = datetime('now')
     WHERE id = ?`
  );
  const insertEducation = db.prepare(
    'INSERT INTO employee_education (employee_id, institution, qualification, year) VALUES (?, ?, ?, ?)'
  );
  const insertExperience = db.prepare(
    'INSERT INTO employee_experience (employee_id, employer, job_title, start_year, end_year) VALUES (?, ?, ?, ?, ?)'
  );
  const insertDependant = db.prepare('INSERT INTO employee_dependants (employee_id, name, dob) VALUES (?, ?, ?)');
  const insertReferee = db.prepare('INSERT INTO employee_referees (employee_id, name, relationship, contact) VALUES (?, ?, ?, ?)');

  rows.forEach((row, index) => {
    const parts = String(row.full_name).split(/\s+/).filter(Boolean);
    const firstName = parts[0] || 'Employee';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
    const sex = index % 2 === 0 ? 'Female' : 'Male';
    const upcoming = dayOffset(offsetDays[index % offsetDays.length]);
    const married = index % 3 !== 0;
    const joinedYear = Number(String(row.joined_on).slice(0, 4)) || upcoming.getUTCFullYear();
    const birthYear = joinedYear - (23 + (index % 6));
    const dob = new Date(Date.UTC(birthYear, upcoming.getUTCMonth(), upcoming.getUTCDate()));
    const joinedDate = new Date(`${row.joined_on}T00:00:00Z`);
    const probationEnd = Number.isNaN(joinedDate.getTime()) ? '' : toIsoDate(new Date(joinedDate.getTime() + 90 * 86400000));
    const contract = index % 7 === 3;
    const leaveTaken = (index * 3) % 13;
    const onLeave = index === 2;
    const phone = `+233 24 ${String(1100000 + index * 3571).padStart(7, '0')}`;
    const altPhone = `+233 20 ${String(2200000 + index * 2711).padStart(7, '0')}`;
    const spouseName = married ? `${dependantFirst[index % dependantFirst.length]} ${lastName}` : '';

    update.run(
      toIsoDate(dob), sex, 'Ghanaian', married ? 'Married' : 'Single', phone, streets[index % streets.length],
      'Ghana Card', `GHA-${String(710000000 + index * 13579).slice(0, 9)}-${index % 10}`,
      contract ? 'Contract' : 'Full-time', probationEnd, contract ? toIsoDate(dayOffset(180)) : null,
      25, leaveTaken, onLeave ? toIsoDate(dayOffset(-2)) : null, onLeave ? toIsoDate(dayOffset(10)) : null, 'Annual',
      `Mr. ${lastName}`, altPhone, `Mrs. ${lastName}`, altPhone,
      spouseName || null, spouseName ? altPhone : null,
      `${dependantFirst[(index + 2) % dependantFirst.length]} ${lastName}`, 'Sibling', altPhone,
      married ? spouseName : `Mr. ${lastName}`, married ? 'Spouse' : 'Parent', married ? altPhone : altPhone,
      bloodGroups[index % bloodGroups.length], index % 4 === 0 ? 'Penicillin' : 'None known',
      index % 6 === 0 ? 'Mild asthma' : 'None', `C${String(1200000000 + index * 7919).slice(0, 10)}`,
      row.id
    );

    insertEducation.run(row.id, education[index % education.length][0], education[index % education.length][1], joinedYear - 1);
    if (index % 3 === 0) {
      insertEducation.run(row.id, 'Accra Senior High School', 'WASSCE', joinedYear - 5);
    }
    insertExperience.run(row.id, previousRoles[index % previousRoles.length][0], previousRoles[index % previousRoles.length][1], joinedYear - 4, joinedYear - 1);

    if (married) {
      const childAge = 4 + (index % 12);
      insertDependant.run(row.id, `${dependantFirst[index % dependantFirst.length]} ${lastName}`, toIsoDate(dayOffset(-(childAge * 365 + 40))));
    }

    insertReferee.run(row.id, `${refereeFirst[index % refereeFirst.length]} ${lastName}`, 'Former supervisor', altPhone);
    if (index % 4 === 0) {
      insertReferee.run(row.id, `${refereeFirst[(index + 3) % refereeFirst.length]} Mensah`, 'Colleague', phone);
    }
  });

  setSetting('profile_seeded', '1');
}

if (!getSetting('dob_years_fixed')) {
  const seededIds = [
    'EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006', 'EMP-007',
    'EMP-008', 'EMP-009', 'EMP-010', 'EMP-011', 'EMP-012', 'EMP-013', 'EMP-014',
  ];
  const updateDob = db.prepare('UPDATE employees SET dob = ? WHERE staff_id = ?');
  seededIds.forEach((staffId, index) => {
    const row = db.prepare('SELECT joined_on, dob FROM employees WHERE staff_id = ?').get(staffId);
    if (!row || !row.dob) return;
    const joinedYear = Number(String(row.joined_on).slice(0, 4));
    if (!joinedYear) return;
    const corrected = `${joinedYear - (23 + (index % 6))}${String(row.dob).slice(4)}`;
    if (row.dob !== corrected) updateDob.run(corrected, staffId);
  });
  setSetting('dob_years_fixed', '1');
}

if (!getSetting('training_details_seeded')) {
  const facilitators = ['Grace Mensah', 'Anura Silva', 'Linda Owusu', 'Ravi Chandran', 'Adwoa Boateng', 'Mohan Raj'];
  const venues = ['Training room A', 'Training room B', 'Main conference hall', 'Operations boardroom', 'Online — Teams'];
  const rows = db.prepare('SELECT id FROM training_records WHERE facilitator IS NULL ORDER BY id').all();
  const updateTraining = db.prepare(
    'UPDATE training_records SET duration = ?, facilitator = ?, venue = ?, score = ?, certificate_issued = ?, remarks = ? WHERE id = ?'
  );
  rows.forEach((row, index) => {
    const score = 62 + ((index * 7) % 39);
    updateTraining.run(
      ['1 day', '2 days', '3 hours', 'Half day', '6 hours'][index % 5],
      facilitators[index % facilitators.length],
      venues[index % venues.length],
      score,
      score >= 75 ? 1 : 0,
      score >= 75 ? 'Completed — certificate issued.' : 'Attended — refresher recommended.',
      row.id
    );
  });
  setSetting('training_details_seeded', '1');
}

if (!getSetting('training_dates_fixed')) {
  db.prepare("UPDATE training_records SET completed_on = date(completed_on, '-1 year') WHERE completed_on > ?").run(todayIso());
  setSetting('training_dates_fixed', '1');
}

if (!getSetting('expat_seeded')) {
  const first = db.prepare("SELECT id FROM employees WHERE staff_id = 'EMP-006'").get();
  const second = db.prepare("SELECT id FROM employees WHERE staff_id = 'EMP-011'").get();
  if (first) {
    db.prepare(
      `UPDATE employees SET is_expatriate = 1, nationality = 'Indian', passport_number = 'P4821903',
         passport_expiry = ?, work_permit_number = 'WP-2025-118', work_permit_expiry = ?,
         has_accommodation = 1, accommodation_details = 'Company apartment, Cantonments'
       WHERE id = ?`
    ).run(toIsoDate(dayOffset(620)), toIsoDate(dayOffset(45)), first.id);
  }
  if (second) {
    db.prepare(
      `UPDATE employees SET is_expatriate = 1, nationality = 'British', passport_number = 'GBR774210',
         passport_expiry = ?, work_permit_number = 'WP-2024-064', work_permit_expiry = ?,
         has_accommodation = 0, accommodation_details = ''
       WHERE id = ?`
    ).run(toIsoDate(dayOffset(900)), toIsoDate(dayOffset(-12)), second.id);
  }
  setSetting('expat_seeded', '1');
}

if (!getSetting('reminders_seeded')) {
  const insertReminder = db.prepare('INSERT INTO reminders (title, due_on, notes) VALUES (?, ?, ?)');
  insertReminder.run('Confirm November payroll changes', toIsoDate(dayOffset(2)), 'Send approved changes to Finance before the payroll run.');
  insertReminder.run('Renew office insurance', toIsoDate(dayOffset(9)), 'Policy expires at the end of the month.');
  insertReminder.run('Book fire drill', toIsoDate(dayOffset(-2)), 'Overdue — reschedule with the Operations team.');
  setSetting('reminders_seeded', '1');
}

if (!getSetting('bank_seeded')) {
  const banks = ['Ecobank', 'GCB Bank', 'Absa', 'Stanbic Bank', 'Fidelity Bank', 'CalBank', 'Zenith Bank'];
  const branches = ['Colombo 03', 'Colombo 07', 'Nugegoda', 'Kandy', 'Galle', 'Negombo'];
  const pending = db.prepare('SELECT id, full_name FROM employees WHERE bank_name IS NULL ORDER BY id').all();
  const updateBank = db.prepare(
    'UPDATE employees SET bank_name = ?, bank_branch = ?, account_name = ?, account_number = ?, ssnit_number = ? WHERE id = ?'
  );
  pending.forEach((row, index) => {
    const accountName = row.full_name;
    const accountNumber = `0131${String(row.id).padStart(9, '0')}`;
    const ssnitNumber = `C${String(1200000000 + Number(row.id) * 7919).slice(0, 10)}`;
    updateBank.run(banks[index % banks.length], branches[index % branches.length], accountName, accountNumber, ssnitNumber, row.id);
  });
  setSetting('bank_seeded', '1');
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[key] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

function sessionUser(req) {
  const token = parseCookies(req.headers.cookie).hrms_session;
  if (!token) return null;
  const tokenHash = sha256(token);
  const row = db.prepare(
    `SELECT u.id, u.username, u.display_name, u.role, u.active, u.employee_id, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  ).get(tokenHash);
  if (!row) return null;
  if (Number(row.expires_at) <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  if (Number(row.active) !== 1) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    employeeId: row.employee_id === null || row.employee_id === undefined ? null : Number(row.employee_id),
  };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + SESSION_MS);
  return token;
}

function sessionCookie(token, maxAgeSeconds = SESSION_MS / 1000) {
  return `hrms_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

const attempts = new Map();

function lockSeconds(key) {
  const record = attempts.get(key);
  if (!record) return 0;
  if (record.until > Date.now()) return Math.ceil((record.until - Date.now()) / 1000);
  if (record.until > 0) attempts.delete(key);
  return 0;
}

function noteFailure(key) {
  const record = attempts.get(key) || { count: 0, until: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.count = 0;
    record.until = Date.now() + 60 * 1000;
  }
  attempts.set(key, record);
  if (attempts.size > 1000) attempts.clear();
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  );
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function serveFile(res, filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return sendText(res, 404, 'Not found');
  }
  if (!stat.isFile()) return sendText(res, 404, 'Not found');
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });
  if (res.req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const err = new Error('That upload is too large.');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const err = new Error('Invalid request.');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function dashboardStats() {
  const totals = db.prepare(
    "SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0) AS active FROM employees"
  ).get();
  const training = db.prepare('SELECT COUNT(*) AS c FROM training_records').get().c;
  const departments = db.prepare('SELECT COUNT(*) AS c FROM departments WHERE system = 0').get().c;
  const longest = db.prepare(
    "SELECT full_name, staff_id, joined_on FROM employees WHERE status = 'Active' ORDER BY joined_on ASC LIMIT 1"
  ).get();

  let longestInfo = null;
  if (longest) {
    const joined = Date.parse(`${longest.joined_on}T00:00:00Z`);
    const years = Math.max(0, (Date.now() - joined) / 31557600000);
    longestInfo = {
      name: longest.full_name,
      staffId: longest.staff_id,
      years: Number(years.toFixed(1)),
    };
  }

  return {
    total: Number(totals.total),
    active: Number(totals.active),
    inactive: Number(totals.total) - Number(totals.active),
    training: Number(training),
    departments: Number(departments),
    longest: longestInfo,
  };
}

function listEmployees(query) {
  const q = String(query || '').trim().slice(0, 80);
  if (!q) {
    return db.prepare(
      'SELECT id, staff_id, full_name, department, unit, position, email, joined_on, status FROM employees ORDER BY full_name COLLATE NOCASE ASC'
    ).all();
  }
  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  return db.prepare(
    `SELECT id, staff_id, full_name, department, unit, position, email, joined_on, status
       FROM employees
      WHERE full_name LIKE ? ESCAPE '\\' OR staff_id LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\'
            OR unit LIKE ? ESCAPE '\\'
      ORDER BY full_name COLLATE NOCASE ASC
      LIMIT 500`
  ).all(pattern, pattern, pattern, pattern);
}

function employeesPayload(rawRows) {
  return rawRows.map((row) => ({
    id: Number(row.id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    unit: row.unit || '',
    position: row.position,
    email: row.email || '',
    joinedOn: row.joined_on,
    status: row.status,
  }));
}

function requireUser(req, res) {
  const user = sessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Please sign in.' });
    return null;
  }
  return user;
}

function requireEditor(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!['admin', 'hr'].includes(user.role)) {
    sendJson(res, 403, { error: 'You do not have permission to make that change.' });
    return null;
  }
  return user;
}

function requireHealthEditor(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!['admin', 'hr', 'nurse'].includes(user.role)) {
    sendJson(res, 403, { error: 'You do not have permission to change health records.' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    sendJson(res, 403, { error: 'Only an administrator can manage user accounts.' });
    return null;
  }
  return user;
}

function listDepartments() {
  const unitsByDepartment = new Map();
  const unitRows = db.prepare(
    `SELECT u.id, u.department_id, u.name,
            (SELECT COUNT(*) FROM employees x WHERE x.department = d.name AND x.unit = u.name COLLATE NOCASE) AS staff_count
       FROM units u
       JOIN departments d ON d.id = u.department_id
      ORDER BY u.name COLLATE NOCASE ASC`
  ).all();
  for (const row of unitRows) {
    const key = Number(row.department_id);
    if (!unitsByDepartment.has(key)) unitsByDepartment.set(key, []);
    unitsByDepartment.get(key).push({
      id: Number(row.id),
      name: row.name,
      staffCount: Number(row.staff_count),
    });
  }

  return db.prepare(
    `SELECT d.id, d.name, d.system, d.head_employee_id,
            e.full_name AS head_name, e.staff_id AS head_staff_id,
            (SELECT COUNT(*) FROM employees x WHERE x.department = d.name) AS staff_count
       FROM departments d
       LEFT JOIN employees e ON e.id = d.head_employee_id
      ORDER BY d.system ASC, d.name COLLATE NOCASE ASC`
  ).all().map((row) => ({
    id: Number(row.id),
    name: row.name,
    system: Number(row.system) === 1,
    headEmployeeId: row.head_employee_id === null ? null : Number(row.head_employee_id),
    headName: row.head_name || '',
    headStaffId: row.head_staff_id || '',
    staffCount: Number(row.staff_count),
    units: unitsByDepartment.get(Number(row.id)) || [],
  }));
}

function readHeadId(body) {
  if (body.headEmployeeId === null || body.headEmployeeId === undefined || body.headEmployeeId === '') return null;
  const id = Number(body.headEmployeeId);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

function employeeExists(id) {
  return Boolean(db.prepare('SELECT id FROM employees WHERE id = ?').get(id));
}

function readBankFields(body) {
  return {
    bankName: String(body.bankName || '').trim(),
    bankBranch: String(body.bankBranch || '').trim(),
    accountName: String(body.accountName || '').trim(),
    accountNumber: String(body.accountNumber || '').replace(/\s+/g, ''),
    ssnitNumber: String(body.ssnitNumber || '').trim().toUpperCase(),
  };
}

function validateBankFields(fields) {
  if (fields.bankName.length > 60 || fields.bankBranch.length > 60 || fields.accountName.length > 80) {
    return 'One of the bank fields is too long.';
  }
  if (fields.accountNumber && !/^\d{6,20}$/.test(fields.accountNumber)) {
    return 'Account number must be 6 to 20 digits.';
  }
  if (fields.ssnitNumber && !/^[A-Z]\d{10}$/.test(fields.ssnitNumber)) {
    return 'SSNIT number must be a letter followed by 10 digits, for example C1234567890.';
  }
  return null;
}

function toBankRow(row) {
  return {
    id: Number(row.id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    status: row.status,
    bankName: row.bank_name || '',
    bankBranch: row.bank_branch || '',
    accountName: row.account_name || '',
    accountNumber: row.account_number || '',
    ssnitNumber: row.ssnit_number || '',
  };
}

function bankRows(query) {
  const q = String(query || '').trim().slice(0, 80);
  const select = `SELECT id, staff_id, full_name, department, status,
                         bank_name, bank_branch, account_name, account_number, ssnit_number
                    FROM employees`;
  let rows;
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    rows = db.prepare(
      `${select}
        WHERE full_name LIKE ? ESCAPE '\\' OR staff_id LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\'
        ORDER BY full_name COLLATE NOCASE ASC LIMIT 500`
    ).all(pattern, pattern, pattern);
  } else {
    rows = db.prepare(`${select} ORDER BY full_name COLLATE NOCASE ASC`).all();
  }

  return rows.map(toBankRow);
}

function bankRow(id) {
  const row = db.prepare(
    `SELECT id, staff_id, full_name, department, status,
            bank_name, bank_branch, account_name, account_number, ssnit_number
       FROM employees WHERE id = ?`
  ).get(id);
  return row ? toBankRow(row) : null;
}

/* ---------- Employee directory and profiles ---------- */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const UPLOAD_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function isIsoDate(value) {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function todayIso() {
  return toIsoDate(new Date());
}

function daysFromToday(iso) {
  if (!isIsoDate(iso)) return null;
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) / 86400000);
}

function ageFrom(dob) {
  if (!isIsoDate(dob)) return null;
  const birth = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return Math.max(0, age);
}

function yearsSince(iso) {
  if (!isIsoDate(iso)) return null;
  const start = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(start)) return null;
  return Number(((Date.now() - start) / 31557600000).toFixed(1));
}

function salaryAmount(value) {
  return value === null || value === undefined ? '' : Math.round(Number(value) * 100) / 100;
}

function cleanFilename(name) {
  const cleaned = String(name || 'file')
    .replace(/[\\/:*?"<>|\r\n]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned || 'file';
}

function matchesMagic(mime, buffer) {
  const startsWith = (bytes) => bytes.every((byte, index) => buffer[index] === byte);
  if (mime === 'image/png') return startsWith([0x89, 0x50, 0x4e, 0x47]);
  if (mime === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mime === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'image/gif') return buffer.subarray(0, 3).toString('ascii') === 'GIF';
  if (mime === 'application/pdf') return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  if (mime === 'application/msword') return startsWith([0xd0, 0xcf, 0x11, 0xe0]);
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return startsWith([0x50, 0x4b, 0x03, 0x04]);
  }
  if (mime === 'text/plain') return true;
  return false;
}

function decodeUpload(body) {
  const mime = String(body.mime || '').toLowerCase();
  const filename = cleanFilename(body.filename);
  const base64 = String(body.data || '');
  if (!base64) return { error: 'Choose a file to upload.' };
  if (!UPLOAD_TYPES.has(mime)) return { error: 'Upload a picture, PDF, Word document or text file.' };
  if (base64.length > Math.ceil(MAX_UPLOAD_BYTES * 1.4)) return { error: 'That file is larger than 6 MB.' };
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return { error: 'That file could not be read.' };
  }
  if (!buffer.length) return { error: 'That file could not be read.' };
  if (buffer.length > MAX_UPLOAD_BYTES) return { error: 'That file is larger than 6 MB.' };
  if (!matchesMagic(mime, buffer)) return { error: 'That file does not match its type. Choose another file.' };
  return { mime, filename, buffer, size: buffer.length };
}

function decodePhoto(dataUrl) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) return { error: 'Choose a PNG, JPG or WebP image.' };
  const mime = `image/${match[1]}`;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) return { error: 'That photo could not be read.' };
  if (buffer.length > MAX_PHOTO_BYTES) return { error: 'The photo must be 2 MB or smaller.' };
  if (!matchesMagic(mime, buffer)) return { error: 'That photo is not a valid image.' };
  return { mime, buffer };
}

function sendBlob(res, mime, filename, buffer, inline) {
  const safeName = cleanFilename(filename).replace(/[^\x20-\x7e]/g, '_');
  res.writeHead(200, {
    'Content-Type': mime || 'application/octet-stream',
    'Content-Length': buffer.length,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
}

const EMPLOYEE_COLUMNS = {
  staffId: 'staff_id',
  fullName: 'full_name',
  department: 'department',
  unit: 'unit',
  position: 'position',
  email: 'email',
  phone: 'phone',
  dob: 'dob',
  sex: 'sex',
  nationality: 'nationality',
  maritalStatus: 'marital_status',
  residentialAddress: 'residential_address',
  nationalIdType: 'national_id_type',
  nationalIdNumber: 'national_id_number',
  employmentType: 'employment_type',
  joinedOn: 'joined_on',
  contractEnd: 'contract_end',
  probationEnd: 'probation_end',
  status: 'status',
  leaveEntitlement: 'leave_entitlement',
  leaveOpening: 'leave_opening',
  fatherName: 'father_name',
  fatherContact: 'father_contact',
  motherName: 'mother_name',
  motherContact: 'mother_contact',
  spouseName: 'spouse_name',
  spouseContact: 'spouse_contact',
  nextOfKinName: 'next_of_kin_name',
  nextOfKinRelationship: 'next_of_kin_relationship',
  nextOfKinContact: 'next_of_kin_contact',
  emergencyName: 'emergency_name',
  emergencyRelationship: 'emergency_relationship',
  emergencyContact: 'emergency_contact',
  bankName: 'bank_name',
  bankBranch: 'bank_branch',
  accountName: 'account_name',
  accountNumber: 'account_number',
  ssnitNumber: 'ssnit_number',
  tinNumber: 'tin_number',
  bloodGroup: 'blood_group',
  allergies: 'allergies',
  medicalConditions: 'medical_conditions',
  isExpatriate: 'is_expatriate',
  basicSalary: 'basic_salary',
  housingAllowance: 'housing_allowance',
  transportAllowance: 'transport_allowance',
  otherAllowance: 'other_allowance',
};

function readEmployeePayload(body) {
  const errors = [];
  const text = (key, max, label) => {
    const value = String(body[key] ?? '').trim();
    if (value.length > max) errors.push(`${label} is too long.`);
    return value;
  };
  const date = (key, label) => {
    const value = String(body[key] ?? '').trim();
    if (!value) return '';
    if (!isIsoDate(value)) {
      errors.push(`Enter a valid ${label}.`);
      return '';
    }
    return value;
  };
  const amount = (key, label, min, max) => {
    const raw = body[key];
    if (raw === '' || raw === null || raw === undefined) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) {
      errors.push(`${label} must be between ${min} and ${max}.`);
      return null;
    }
    return Math.round(value * 100) / 100;
  };
  const schoolYear = () => new Date().getFullYear() + 5;

  const payload = {
    staffId: text('staffId', 30, 'Staff ID'),
    fullName: text('fullName', 80, 'Full name'),
    department: text('department', 60, 'Department'),
    unit: text('unit', 60, 'Unit'),
    position: text('position', 80, 'Job title'),
    email: text('email', 120, 'Email'),
    phone: text('phone', 30, 'Phone number'),
    dob: date('dob', 'date of birth'),
    sex: text('sex', 20, 'Sex'),
    nationality: text('nationality', 40, 'Nationality'),
    maritalStatus: text('maritalStatus', 20, 'Marital status'),
    residentialAddress: text('residentialAddress', 200, 'Residential address'),
    nationalIdType: text('nationalIdType', 30, 'National ID type'),
    nationalIdNumber: text('nationalIdNumber', 40, 'National ID number'),
    employmentType: text('employmentType', 30, 'Employment type'),
    joinedOn: date('joinedOn', 'joining date'),
    contractEnd: date('contractEnd', 'contract end date'),
    probationEnd: date('probationEnd', 'probation end date'),
    status: body.status === 'Inactive' ? 'Inactive' : 'Active',
    leaveEntitlement: amount('leaveEntitlement', 'Leave entitlement', 0, 365),
    leaveOpening: amount('leaveOpening', 'Carried-in leave', 0, 365),
    fatherName: text('fatherName', 80, 'Father’s name'),
    fatherContact: text('fatherContact', 30, 'Father’s contact'),
    motherName: text('motherName', 80, 'Mother’s name'),
    motherContact: text('motherContact', 30, 'Mother’s contact'),
    spouseName: text('spouseName', 80, 'Spouse name'),
    spouseContact: text('spouseContact', 30, 'Spouse contact'),
    nextOfKinName: text('nextOfKinName', 80, 'Next of kin name'),
    nextOfKinRelationship: text('nextOfKinRelationship', 40, 'Next of kin relationship'),
    nextOfKinContact: text('nextOfKinContact', 30, 'Next of kin contact'),
    emergencyName: text('emergencyName', 80, 'Emergency contact name'),
    emergencyRelationship: text('emergencyRelationship', 40, 'Emergency contact relationship'),
    emergencyContact: text('emergencyContact', 30, 'Emergency contact number'),
    bankName: text('bankName', 60, 'Bank name'),
    bankBranch: text('bankBranch', 60, 'Branch'),
    accountName: text('accountName', 80, 'Account name'),
    accountNumber: String(body.accountNumber ?? '').replace(/\s+/g, '').slice(0, 24),
    ssnitNumber: String(body.ssnitNumber ?? '').trim().toUpperCase().slice(0, 20),
    tinNumber: String(body.tinNumber ?? '').trim().toUpperCase().slice(0, 20),
    bloodGroup: text('bloodGroup', 10, 'Blood group'),
    allergies: text('allergies', 200, 'Known allergies'),
    medicalConditions: text('medicalConditions', 200, 'Medical conditions'),
    isExpatriate: body.isExpatriate ? 1 : 0,
    basicSalary: amount('basicSalary', 'Basic salary', 0, 10000000),
    housingAllowance: amount('housingAllowance', 'Housing allowance', 0, 10000000),
    transportAllowance: amount('transportAllowance', 'Transport allowance', 0, 10000000),
    otherAllowance: amount('otherAllowance', 'Other allowance', 0, 10000000),
    dependants: [],
    education: [],
    experience: [],
    referees: [],
  };

  if (!payload.fullName) errors.push('Enter the employee’s full name.');
  if (!payload.department) errors.push('Choose a department.');
  if (!payload.position) errors.push('Enter a job title.');
  if (!payload.joinedOn) errors.push('Enter the joining date.');
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Enter a valid email address.');
  }
  if (payload.accountNumber && !/^\d{6,20}$/.test(payload.accountNumber)) {
    errors.push('Account number must be 6 to 20 digits.');
  }
  if (payload.ssnitNumber && !/^[A-Z]\d{10}$/.test(payload.ssnitNumber)) {
    errors.push('SSNIT number must be a letter followed by 10 digits, for example C1234567890.');
  }
  if (payload.dob && payload.dob > todayIso()) errors.push('Date of birth cannot be in the future.');
  if (payload.joinedOn && payload.contractEnd && payload.contractEnd < payload.joinedOn) {
    errors.push('Contract end date must be on or after the joining date.');
  }

  if (Array.isArray(body.dependants)) {
    for (const row of body.dependants.slice(0, 10)) {
      const name = String(row?.name ?? '').trim();
      if (!name) continue;
      const dob = String(row?.dob ?? '').trim();
      if (name.length > 80) errors.push('A dependant name is too long.');
      if (dob && !isIsoDate(dob)) errors.push(`Enter a valid date of birth for ${name}.`);
      payload.dependants.push({ name, dob: dob && isIsoDate(dob) ? dob : null });
    }
  }

  if (Array.isArray(body.education)) {
    for (const row of body.education.slice(0, 10)) {
      const institution = String(row?.institution ?? '').trim();
      if (!institution) continue;
      const qualification = String(row?.qualification ?? '').trim().slice(0, 100);
      const rawYear = row?.year;
      let year = null;
      if (rawYear !== '' && rawYear !== null && rawYear !== undefined) {
        year = Number(rawYear);
        if (!Number.isInteger(year) || year < 1950 || year > schoolYear()) {
          errors.push(`Enter a valid graduation year for ${institution}.`);
          year = null;
        }
      }
      if (institution.length > 100) errors.push('An institution name is too long.');
      payload.education.push({ institution, qualification, year });
    }
  }

  if (Array.isArray(body.experience)) {
    for (const row of body.experience.slice(0, 10)) {
      const employer = String(row?.employer ?? '').trim();
      if (!employer) continue;
      const jobTitle = String(row?.jobTitle ?? '').trim().slice(0, 80);
      const readYear = (value, label) => {
        if (value === '' || value === null || value === undefined) return null;
        const year = Number(value);
        if (!Number.isInteger(year) || year < 1950 || year > schoolYear()) {
          errors.push(`Enter a valid ${label} for ${employer}.`);
          return null;
        }
        return year;
      };
      const startYear = readYear(row?.startYear, 'start year');
      const endYear = readYear(row?.endYear, 'end year');
      if (startYear && endYear && endYear < startYear) {
        errors.push(`The end year for ${employer} must be on or after the start year.`);
      }
      if (employer.length > 100) errors.push('An employer name is too long.');
      payload.experience.push({ employer, jobTitle, startYear, endYear });
    }
  }

  if (Array.isArray(body.referees)) {
    for (const row of body.referees.slice(0, 10)) {
      const name = String(row?.name ?? '').trim();
      if (!name) continue;
      const relationship = String(row?.relationship ?? '').trim().slice(0, 60);
      const contact = String(row?.contact ?? '').trim().slice(0, 60);
      if (name.length > 80) errors.push('A referee name is too long.');
      payload.referees.push({ name, relationship, contact });
    }
  }

  return { payload, errors };
}

function employeeDbValues(payload) {
  return Object.keys(EMPLOYEE_COLUMNS).map((key) => {
    const value = payload[key];
    return value === '' || value === undefined ? null : value;
  });
}

function replaceEmployeeRelations(employeeId, payload) {
  db.prepare('DELETE FROM employee_dependants WHERE employee_id = ?').run(employeeId);
  db.prepare('DELETE FROM employee_education WHERE employee_id = ?').run(employeeId);
  db.prepare('DELETE FROM employee_experience WHERE employee_id = ?').run(employeeId);
  db.prepare('DELETE FROM employee_referees WHERE employee_id = ?').run(employeeId);

  const insertDependant = db.prepare('INSERT INTO employee_dependants (employee_id, name, dob) VALUES (?, ?, ?)');
  for (const row of payload.dependants) insertDependant.run(employeeId, row.name, row.dob);

  const insertEducation = db.prepare(
    'INSERT INTO employee_education (employee_id, institution, qualification, year) VALUES (?, ?, ?, ?)'
  );
  for (const row of payload.education) insertEducation.run(employeeId, row.institution, row.qualification || null, row.year);

  const insertExperience = db.prepare(
    'INSERT INTO employee_experience (employee_id, employer, job_title, start_year, end_year) VALUES (?, ?, ?, ?, ?)'
  );
  for (const row of payload.experience) {
    insertExperience.run(employeeId, row.employer, row.jobTitle || null, row.startYear, row.endYear);
  }

  const insertReferee = db.prepare(
    'INSERT INTO employee_referees (employee_id, name, relationship, contact) VALUES (?, ?, ?, ?)'
  );
  for (const row of payload.referees) insertReferee.run(employeeId, row.name, row.relationship || null, row.contact || null);
}

function trainingPayload(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeName: row.full_name,
    staffId: row.staff_id,
    title: row.title,
    completedOn: row.completed_on,
    duration: row.duration || '',
    facilitator: row.facilitator || '',
    venue: row.venue || '',
    score: row.score === null || row.score === undefined ? null : Number(row.score),
    certificateIssued: Number(row.certificate_issued) === 1,
    remarks: row.remarks || '',
  };
}

function trainingForEmployee(employeeId) {
  return db.prepare(
    `SELECT t.*, e.full_name, e.staff_id
       FROM training_records t JOIN employees e ON e.id = t.employee_id
      WHERE t.employee_id = ?
      ORDER BY t.completed_on DESC, t.id DESC`
  ).all(employeeId).map(trainingPayload);
}

function documentPayload(row) {
  return {
    id: Number(row.id),
    title: row.title,
    filename: row.filename,
    mime: row.mime,
    size: Number(row.size),
    uploadedAt: row.uploaded_at,
    downloadUrl: `/api/documents/${row.id}/download`,
  };
}

function healthRecordPayload(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeName: row.full_name,
    staffId: row.staff_id,
    title: row.title,
    recordDate: row.record_date,
    notes: row.notes || '',
    filename: row.filename || '',
    mime: row.mime || '',
    size: row.size === null || row.size === undefined ? null : Number(row.size),
    uploadedAt: row.uploaded_at,
    hasFile: Boolean(row.filename),
    fileUrl: row.filename ? `/api/health-records/${row.id}/file` : null,
  };
}

function employeeProfile(id) {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!row) return null;
  const hasPhoto = Boolean(row.photo_data && row.photo_data.length);
  const balance = leaveBalanceFor(row.id, new Date().getFullYear());
  const currentLeave = db.prepare(
    `SELECT leave_type, start_on, end_on FROM leave_requests
      WHERE employee_id = ? AND status = 'Approved' AND start_on <= ? AND end_on >= ?
      ORDER BY start_on DESC, id DESC LIMIT 1`
  ).get(id, todayIso(), todayIso());

  return {
    id: Number(row.id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    unit: row.unit || '',
    position: row.position,
    email: row.email || '',
    phone: row.phone || '',
    dob: row.dob || '',
    age: ageFrom(row.dob),
    sex: row.sex || '',
    nationality: row.nationality || '',
    maritalStatus: row.marital_status || '',
    residentialAddress: row.residential_address || '',
    nationalIdType: row.national_id_type || '',
    nationalIdNumber: row.national_id_number || '',
    employmentType: row.employment_type || '',
    joinedOn: row.joined_on,
    yearsOfService: yearsSince(row.joined_on),
    contractEnd: row.contract_end || '',
    probationEnd: row.probation_end || '',
    status: row.status,
    leaveEntitlement: balance.entitlement,
    leaveOpening: balance.opening,
    leaveTaken: balance.taken,
    leavePending: balance.pending,
    leaveBalance: balance.remaining,
    leaveBalanceYear: balance.year,
    currentLeave: currentLeave
      ? { type: currentLeave.leave_type, startOn: currentLeave.start_on, endOn: currentLeave.end_on }
      : null,
    fatherName: row.father_name || '',
    fatherContact: row.father_contact || '',
    motherName: row.mother_name || '',
    motherContact: row.mother_contact || '',
    spouseName: row.spouse_name || '',
    spouseContact: row.spouse_contact || '',
    nextOfKinName: row.next_of_kin_name || '',
    nextOfKinRelationship: row.next_of_kin_relationship || '',
    nextOfKinContact: row.next_of_kin_contact || '',
    emergencyName: row.emergency_name || '',
    emergencyRelationship: row.emergency_relationship || '',
    emergencyContact: row.emergency_contact || '',
    bankName: row.bank_name || '',
    bankBranch: row.bank_branch || '',
    accountName: row.account_name || '',
    accountNumber: row.account_number || '',
    ssnitNumber: row.ssnit_number || '',
    tinNumber: row.tin_number || '',
    bloodGroup: row.blood_group || '',
    allergies: row.allergies || '',
    medicalConditions: row.medical_conditions || '',
    isExpatriate: Number(row.is_expatriate) === 1,
    basicSalary: salaryAmount(row.basic_salary),
    housingAllowance: salaryAmount(row.housing_allowance),
    transportAllowance: salaryAmount(row.transport_allowance),
    otherAllowance: salaryAmount(row.other_allowance),
    passportNumber: row.passport_number || '',
    passportExpiry: row.passport_expiry || '',
    workPermitNumber: row.work_permit_number || '',
    workPermitExpiry: row.work_permit_expiry || '',
    hasAccommodation: Number(row.has_accommodation) === 1,
    accommodationDetails: row.accommodation_details || '',
    hasPhoto,
    photoUrl: hasPhoto ? `/api/employees/${row.id}/photo` : null,
    dependants: db.prepare('SELECT id, name, dob FROM employee_dependants WHERE employee_id = ? ORDER BY dob, id').all(id)
      .map((item) => ({ id: Number(item.id), name: item.name, dob: item.dob || '' })),
    education: db.prepare('SELECT id, institution, qualification, year FROM employee_education WHERE employee_id = ? ORDER BY year DESC, id').all(id)
      .map((item) => ({
        id: Number(item.id),
        institution: item.institution,
        qualification: item.qualification || '',
        year: item.year === null ? null : Number(item.year),
      })),
    experience: db.prepare('SELECT id, employer, job_title, start_year, end_year FROM employee_experience WHERE employee_id = ? ORDER BY start_year DESC, id').all(id)
      .map((item) => ({
        id: Number(item.id),
        employer: item.employer,
        jobTitle: item.job_title || '',
        startYear: item.start_year === null ? null : Number(item.start_year),
        endYear: item.end_year === null ? null : Number(item.end_year),
      })),
    referees: db.prepare('SELECT id, name, relationship, contact FROM employee_referees WHERE employee_id = ? ORDER BY id').all(id)
      .map((item) => ({
        id: Number(item.id),
        name: item.name,
        relationship: item.relationship || '',
        contact: item.contact || '',
      })),
    documents: db.prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY uploaded_at DESC, id DESC').all(id)
      .map(documentPayload),
    training: trainingForEmployee(id),
    healthRecords: db.prepare(
      `SELECT h.*, e.full_name, e.staff_id
         FROM health_records h JOIN employees e ON e.id = h.employee_id
        WHERE h.employee_id = ? ORDER BY h.record_date DESC, h.id DESC`
    ).all(id).map(healthRecordPayload),
  };
}

function employeeDirectory(query, department, status, employmentType) {
  const conditions = [];
  const params = [];
  const q = String(query || '').trim().slice(0, 80);
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    conditions.push(
      `(full_name LIKE ? ESCAPE '\\' OR staff_id LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR position LIKE ? ESCAPE '\\' OR unit LIKE ? ESCAPE '\\')`
    );
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (department) {
    conditions.push('department = ?');
    params.push(String(department).slice(0, 60));
  }
  if (status === 'Active' || status === 'Inactive') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (employmentType) {
    conditions.push('employment_type = ?');
    params.push(String(employmentType).slice(0, 30));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(
    `SELECT id, staff_id, full_name, department, unit, position, email, phone, joined_on, status,
            employment_type, nationality, is_expatriate,
            (photo_data IS NOT NULL) AS has_photo
       FROM employees ${where}
      ORDER BY full_name COLLATE NOCASE ASC
      LIMIT 500`
  ).all(...params).map((row) => ({
    id: Number(row.id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    unit: row.unit || '',
    position: row.position,
    email: row.email || '',
    phone: row.phone || '',
    joinedOn: row.joined_on,
    status: row.status,
    employmentType: row.employment_type || '',
    nationality: row.nationality || '',
    isExpatriate: Number(row.is_expatriate) === 1,
    hasPhoto: Number(row.has_photo) === 1,
  }));
}

function handleGetEmployee(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const profile = employeeProfile(id);
  if (!profile) return sendJson(res, 404, { error: 'That employee no longer exists.' });
  sendJson(res, 200, { employee: profile });
}

function nextStaffId() {
  const rows = db.prepare("SELECT staff_id FROM employees WHERE staff_id LIKE 'EMP-%'").all();
  let highest = 0;
  for (const row of rows) {
    const match = /^EMP-(\d+)$/i.exec(String(row.staff_id));
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `EMP-${String(highest + 1).padStart(3, '0')}`;
}

function handleNextStaffId(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;
  sendJson(res, 200, { staffId: nextStaffId() });
}

async function handleSaveEmployee(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const existing = id ? db.prepare('SELECT id, staff_id FROM employees WHERE id = ?').get(id) : null;
  if (id && !existing) return sendJson(res, 404, { error: 'That employee no longer exists.' });

  const body = await readJson(req, 8 * 1024 * 1024);
  const { payload, errors } = readEmployeePayload(body);

  if (payload.department && !db.prepare('SELECT id FROM departments WHERE name = ?').get(payload.department)) {
    errors.push('Choose a department from the list.');
  }

  if (payload.unit) {
    const department = db.prepare('SELECT id FROM departments WHERE name = ?').get(payload.department);
    const unit = department
      ? db.prepare('SELECT name FROM units WHERE department_id = ? AND name = ? COLLATE NOCASE').get(department.id, payload.unit)
      : null;
    if (department && !unit) {
      errors.push('Choose a unit from the selected department.');
    } else if (unit) {
      payload.unit = unit.name;
    }
  }

  let photo = null;
  if (body.photoDataUrl) {
    const decoded = decodePhoto(body.photoDataUrl);
    if (decoded.error) errors.push(decoded.error);
    else photo = decoded;
  }

  if (errors.length) return sendJson(res, 400, { error: errors[0] });

  payload.staffId = id ? existing.staff_id : nextStaffId();

  const keys = Object.keys(EMPLOYEE_COLUMNS);
  const columns = keys.map((key) => EMPLOYEE_COLUMNS[key]);
  let employeeId = id;

  db.exec('BEGIN IMMEDIATE');
  try {
    if (id) {
      const assignments = columns.map((column) => `${column} = ?`).join(', ');
      db.prepare(`UPDATE employees SET ${assignments}, updated_at = datetime('now') WHERE id = ?`)
        .run(...employeeDbValues(payload), id);
    } else {
      const result = db.prepare(
        `INSERT INTO employees (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
      ).run(...employeeDbValues(payload));
      employeeId = Number(result.lastInsertRowid);
    }

    if (photo) {
      db.prepare('UPDATE employees SET photo_mime = ?, photo_data = ? WHERE id = ?').run(photo.mime, photo.buffer, employeeId);
    } else if (body.removePhoto) {
      db.prepare('UPDATE employees SET photo_mime = NULL, photo_data = NULL WHERE id = ?').run(employeeId);
    }

    replaceEmployeeRelations(employeeId, payload);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  sendJson(res, id ? 200 : 201, { employee: employeeProfile(employeeId) });
}

function handleEmployeePhoto(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare('SELECT photo_mime, photo_data FROM employees WHERE id = ?').get(id);
  if (!row || !row.photo_data) return sendText(res, 404, 'No photo.');
  sendBlob(res, row.photo_mime || 'image/jpeg', `employee-${id}`, Buffer.from(row.photo_data), true);
}

async function handleUploadDocument(req, res, employeeId) {
  const user = requireEditor(req, res);
  if (!user) return;
  if (!employeeExists(employeeId)) return sendJson(res, 404, { error: 'That employee no longer exists.' });

  const body = await readJson(req, 10 * 1024 * 1024);
  const file = decodeUpload(body);
  if (file.error) return sendJson(res, 400, { error: file.error });

  const title = String(body.title || '').trim().slice(0, 80)
    || file.filename.replace(/\.[^.]+$/, '').slice(0, 80)
    || 'Document';

  const result = db.prepare(
    'INSERT INTO employee_documents (employee_id, title, filename, mime, size, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(employeeId, title, file.filename, file.mime, file.size, file.buffer);

  const row = db.prepare('SELECT * FROM employee_documents WHERE id = ?').get(Number(result.lastInsertRowid));
  sendJson(res, 201, { document: documentPayload(row) });
}

function handleDownloadDocument(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare('SELECT filename, mime, data FROM employee_documents WHERE id = ?').get(id);
  if (!row) return sendText(res, 404, 'Not found.');
  sendBlob(res, row.mime, row.filename, Buffer.from(row.data), false);
}

function handleDeleteDocument(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const result = db.prepare('DELETE FROM employee_documents WHERE id = ?').run(id);
  if (!Number(result.changes)) return sendJson(res, 404, { error: 'That document no longer exists.' });
  sendJson(res, 200, { ok: true });
}

/* ---------- Training ---------- */

function trainingRows(url) {
  const conditions = [];
  const params = [];
  const q = String(url.searchParams.get('q') || '').trim().slice(0, 80);
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    conditions.push(
      `(t.title LIKE ? ESCAPE '\\' OR e.full_name LIKE ? ESCAPE '\\' OR e.staff_id LIKE ? ESCAPE '\\' OR t.facilitator LIKE ? ESCAPE '\\')`
    );
    params.push(pattern, pattern, pattern, pattern);
  }
  const employeeId = Number(url.searchParams.get('employeeId'));
  if (Number.isInteger(employeeId) && employeeId > 0) {
    conditions.push('t.employee_id = ?');
    params.push(employeeId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(
    `SELECT t.*, e.full_name, e.staff_id
       FROM training_records t JOIN employees e ON e.id = t.employee_id
       ${where}
      ORDER BY t.completed_on DESC, t.id DESC
      LIMIT 500`
  ).all(...params).map(trainingPayload);
}

function readTrainingBody(body, errors) {
  const employeeId = Number(body.employeeId);
  if (!Number.isInteger(employeeId) || !employeeExists(employeeId)) {
    errors.push('Choose an employee.');
  }
  const title = String(body.title || '').trim();
  if (!title) errors.push('Enter a training title.');
  if (title.length > 100) errors.push('That training title is too long.');

  const completedOn = String(body.completedOn || '').trim();
  if (!isIsoDate(completedOn)) errors.push('Enter a valid training date.');

  const duration = String(body.duration || '').trim().slice(0, 40);
  const facilitator = String(body.facilitator || '').trim().slice(0, 80);
  const venue = String(body.venue || '').trim().slice(0, 80);
  const remarks = String(body.remarks || '').trim().slice(0, 300);

  let score = null;
  if (body.score !== '' && body.score !== null && body.score !== undefined) {
    score = Number(body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      errors.push('Score must be between 0 and 100.');
      score = null;
    }
  }

  return {
    employeeId,
    title,
    completedOn,
    duration,
    facilitator,
    venue,
    score,
    certificateIssued: body.certificateIssued ? 1 : 0,
    remarks,
  };
}

function handleListTraining(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, { training: trainingRows(url) });
}

async function handleCreateTraining(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;
  const body = await readJson(req);
  const errors = [];
  const training = readTrainingBody(body, errors);
  if (errors.length) return sendJson(res, 400, { error: errors[0] });

  const result = db.prepare(
    `INSERT INTO training_records (employee_id, title, completed_on, duration, facilitator, venue, score, certificate_issued, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    training.employeeId, training.title, training.completedOn, training.duration || null,
    training.facilitator || null, training.venue || null, training.score,
    training.certificateIssued, training.remarks || null
  );

  const row = db.prepare(
    'SELECT t.*, e.full_name, e.staff_id FROM training_records t JOIN employees e ON e.id = t.employee_id WHERE t.id = ?'
  ).get(Number(result.lastInsertRowid));
  sendJson(res, 201, { training: trainingPayload(row) });
}

async function handleUpdateTraining(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const existing = db.prepare('SELECT id FROM training_records WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'That training record no longer exists.' });

  const body = await readJson(req);
  const errors = [];
  const training = readTrainingBody(body, errors);
  if (errors.length) return sendJson(res, 400, { error: errors[0] });

  db.prepare(
    `UPDATE training_records
        SET employee_id = ?, title = ?, completed_on = ?, duration = ?, facilitator = ?, venue = ?,
            score = ?, certificate_issued = ?, remarks = ?
      WHERE id = ?`
  ).run(
    training.employeeId, training.title, training.completedOn, training.duration || null,
    training.facilitator || null, training.venue || null, training.score,
    training.certificateIssued, training.remarks || null, id
  );

  const row = db.prepare(
    'SELECT t.*, e.full_name, e.staff_id FROM training_records t JOIN employees e ON e.id = t.employee_id WHERE t.id = ?'
  ).get(id);
  sendJson(res, 200, { training: trainingPayload(row) });
}

function handleDeleteTraining(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const result = db.prepare('DELETE FROM training_records WHERE id = ?').run(id);
  if (!Number(result.changes)) return sendJson(res, 404, { error: 'That training record no longer exists.' });
  sendJson(res, 200, { ok: true });
}

/* ---------- Health records ---------- */

function healthRows(url) {
  const conditions = [];
  const params = [];
  const q = String(url.searchParams.get('q') || '').trim().slice(0, 80);
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    conditions.push(
      `(h.title LIKE ? ESCAPE '\\' OR e.full_name LIKE ? ESCAPE '\\' OR e.staff_id LIKE ? ESCAPE '\\' OR h.notes LIKE ? ESCAPE '\\')`
    );
    params.push(pattern, pattern, pattern, pattern);
  }
  const employeeId = Number(url.searchParams.get('employeeId'));
  if (Number.isInteger(employeeId) && employeeId > 0) {
    conditions.push('h.employee_id = ?');
    params.push(employeeId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(
    `SELECT h.*, e.full_name, e.staff_id
       FROM health_records h JOIN employees e ON e.id = h.employee_id
       ${where}
      ORDER BY h.record_date DESC, h.id DESC
      LIMIT 500`
  ).all(...params).map(healthRecordPayload);
}

function handleListHealthRecords(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, { records: healthRows(url) });
}

async function handleCreateHealthRecord(req, res) {
  const user = requireHealthEditor(req, res);
  if (!user) return;

  const body = await readJson(req, 10 * 1024 * 1024);
  const employeeId = Number(body.employeeId);
  const title = String(body.title || '').trim().slice(0, 100);
  const recordDate = String(body.recordDate || '').trim();
  const notes = String(body.notes || '').trim().slice(0, 1000);

  if (!Number.isInteger(employeeId) || !employeeExists(employeeId)) {
    return sendJson(res, 400, { error: 'Choose an employee.' });
  }
  if (!title) return sendJson(res, 400, { error: 'Enter a record title.' });
  if (!isIsoDate(recordDate)) return sendJson(res, 400, { error: 'Enter a valid record date.' });

  let file = null;
  if (body.data) {
    file = decodeUpload(body);
    if (file.error) return sendJson(res, 400, { error: file.error });
  }

  const result = db.prepare(
    `INSERT INTO health_records (employee_id, title, record_date, notes, filename, mime, size, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    employeeId, title, recordDate, notes || null,
    file ? file.filename : null, file ? file.mime : null, file ? file.size : null, file ? file.buffer : null
  );

  const row = db.prepare(
    'SELECT h.*, e.full_name, e.staff_id FROM health_records h JOIN employees e ON e.id = h.employee_id WHERE h.id = ?'
  ).get(Number(result.lastInsertRowid));
  sendJson(res, 201, { record: healthRecordPayload(row) });
}

function handleHealthRecordFile(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare('SELECT filename, mime, data FROM health_records WHERE id = ?').get(id);
  if (!row || !row.data) return sendText(res, 404, 'No file.');
  const inline = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'].includes(row.mime);
  sendBlob(res, row.mime, row.filename, Buffer.from(row.data), inline);
}

function handleDeleteHealthRecord(req, res, id) {
  const user = requireHealthEditor(req, res);
  if (!user) return;
  const result = db.prepare('DELETE FROM health_records WHERE id = ?').run(id);
  if (!Number(result.changes)) return sendJson(res, 404, { error: 'That health record no longer exists.' });
  sendJson(res, 200, { ok: true });
}

/* ---------- Expatriates ---------- */

function expatDocumentStatus(date) {
  if (!isIsoDate(date)) return 'missing';
  const days = daysFromToday(date);
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring';
  return 'valid';
}

function expatriatePayload() {
  const rows = db.prepare(
    `SELECT id, staff_id, full_name, department, position, nationality, passport_number, passport_expiry,
            work_permit_number, work_permit_expiry, has_accommodation, accommodation_details
       FROM employees WHERE is_expatriate = 1
      ORDER BY full_name COLLATE NOCASE ASC`
  ).all().map((row) => ({
    id: Number(row.id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    position: row.position,
    nationality: row.nationality || '',
    passportNumber: row.passport_number || '',
    passportExpiry: row.passport_expiry || '',
    passportStatus: expatDocumentStatus(row.passport_expiry),
    workPermitNumber: row.work_permit_number || '',
    workPermitExpiry: row.work_permit_expiry || '',
    permitStatus: expatDocumentStatus(row.work_permit_expiry),
    hasAccommodation: Number(row.has_accommodation) === 1,
    accommodationDetails: row.accommodation_details || '',
  }));

  return {
    employees: rows,
    stats: {
      total: rows.length,
      expiringPermits: rows.filter((row) => row.permitStatus === 'expiring').length,
      expiredDocuments: rows.filter((row) => row.permitStatus === 'expired' || row.passportStatus === 'expired').length,
      withAccommodation: rows.filter((row) => row.hasAccommodation).length,
      passports: rows.filter((row) => row.passportNumber).length,
    },
  };
}

function handleListExpatriates(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, expatriatePayload());
}

async function handleUpdateExpatriate(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'That employee no longer exists.' });

  const body = await readJson(req);
  if (body.isExpatriate === false) {
    db.prepare('UPDATE employees SET is_expatriate = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id);
    return sendJson(res, 200, expatriatePayload());
  }

  const nationality = String(body.nationality || '').trim().slice(0, 40);
  const passportNumber = String(body.passportNumber || '').trim().toUpperCase().slice(0, 30);
  const passportExpiry = String(body.passportExpiry || '').trim();
  const permitNumber = String(body.workPermitNumber || '').trim().toUpperCase().slice(0, 30);
  const permitExpiry = String(body.workPermitExpiry || '').trim();
  const accommodationDetails = String(body.accommodationDetails || '').trim().slice(0, 160);
  const hasAccommodation = body.hasAccommodation ? 1 : 0;

  if (!nationality) return sendJson(res, 400, { error: 'Enter the employee’s nationality.' });
  if (passportExpiry && !isIsoDate(passportExpiry)) return sendJson(res, 400, { error: 'Enter a valid passport expiry date.' });
  if (permitExpiry && !isIsoDate(permitExpiry)) return sendJson(res, 400, { error: 'Enter a valid work permit expiry date.' });

  db.prepare(
    `UPDATE employees
        SET is_expatriate = 1, nationality = ?, passport_number = ?, passport_expiry = ?,
            work_permit_number = ?, work_permit_expiry = ?, has_accommodation = ?, accommodation_details = ?,
            updated_at = datetime('now')
      WHERE id = ?`
  ).run(
    nationality, passportNumber || null, passportExpiry || null,
    permitNumber || null, permitExpiry || null, hasAccommodation, accommodationDetails || null, id
  );

  sendJson(res, 200, expatriatePayload());
}

/* ---------- Reminders ---------- */

function reminderPayload() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayUtc = new Date(`${todayIso()}T00:00:00Z`);
  const birthdays = [];

  for (const row of db.prepare('SELECT id, full_name, staff_id, department, dob FROM employees WHERE dob IS NOT NULL').all()) {
    if (!isIsoDate(row.dob)) continue;
    const [year, month, day] = row.dob.split('-').map(Number);
    let next = new Date(Date.UTC(today.getFullYear(), month - 1, day, 12));
    if (next < todayUtc) next = new Date(Date.UTC(today.getFullYear() + 1, month - 1, day, 12));
    const days = Math.round((next - todayUtc) / 86400000);
    if (days < 0 || days > 60) continue;
    birthdays.push({
      id: Number(row.id),
      fullName: row.full_name,
      staffId: row.staff_id,
      department: row.department,
      date: toIsoDate(next),
      days,
      turning: next.getUTCFullYear() - year,
    });
  }
  birthdays.sort((a, b) => a.days - b.days);

  const tasks = db.prepare(
    'SELECT id, title, due_on, notes, done FROM reminders ORDER BY done ASC, due_on ASC, id ASC'
  ).all().map((row) => ({
    id: Number(row.id),
    title: row.title,
    dueOn: row.due_on,
    notes: row.notes || '',
    done: Number(row.done) === 1,
    daysLeft: daysFromToday(row.due_on),
  }));

  const milestones = [
    ['probation_end', 'Probation ends'],
    ['contract_end', 'Contract ends'],
    ['work_permit_expiry', 'Work permit expires'],
    ['passport_expiry', 'Passport expires'],
  ];
  const upcoming = [];
  for (const row of db.prepare(
    `SELECT id, full_name, staff_id, department, probation_end, contract_end, work_permit_expiry, passport_expiry
       FROM employees WHERE status = 'Active'`
  ).all()) {
    for (const [column, label] of milestones) {
      const days = daysFromToday(row[column]);
      if (days === null || days > 90 || days < -60) continue;
      upcoming.push({
        id: Number(row.id),
        fullName: row.full_name,
        staffId: row.staff_id,
        department: row.department,
        label,
        date: row[column],
        days,
      });
    }
  }
  upcoming.sort((a, b) => a.days - b.days || a.fullName.localeCompare(b.fullName));

  return { birthdays, tasks, upcoming };
}

function handleListReminders(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, reminderPayload());
}

async function handleCreateReminder(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;

  const body = await readJson(req);
  const title = String(body.title || '').trim().slice(0, 100);
  const dueOn = String(body.dueOn || '').trim();
  const notes = String(body.notes || '').trim().slice(0, 500);

  if (!title) return sendJson(res, 400, { error: 'Enter a task title.' });
  if (!isIsoDate(dueOn)) return sendJson(res, 400, { error: 'Enter a valid due date.' });

  db.prepare('INSERT INTO reminders (title, due_on, notes) VALUES (?, ?, ?)').run(title, dueOn, notes || null);
  sendJson(res, 201, reminderPayload());
}

async function handleUpdateReminder(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const existing = db.prepare('SELECT id FROM reminders WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'That task no longer exists.' });

  const body = await readJson(req);
  if (Object.prototype.hasOwnProperty.call(body, 'done')) {
    db.prepare('UPDATE reminders SET done = ? WHERE id = ?').run(body.done ? 1 : 0, id);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'title') || Object.prototype.hasOwnProperty.call(body, 'dueOn')) {
    const title = String(body.title || '').trim().slice(0, 100);
    const dueOn = String(body.dueOn || '').trim();
    if (!title) return sendJson(res, 400, { error: 'Enter a task title.' });
    if (!isIsoDate(dueOn)) return sendJson(res, 400, { error: 'Enter a valid due date.' });
    const notes = String(body.notes || '').trim().slice(0, 500);
    db.prepare('UPDATE reminders SET title = ?, due_on = ?, notes = ? WHERE id = ?').run(title, dueOn, notes || null, id);
  }
  sendJson(res, 200, reminderPayload());
}

function handleDeleteReminder(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  if (!Number(result.changes)) return sendJson(res, 404, { error: 'That task no longer exists.' });
  sendJson(res, 200, { ok: true });
}

async function handleLogin(req, res) {
  const body = await readJson(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!username || !password) {
    return sendJson(res, 400, { error: 'Enter your username and password.' });
  }
  if (username.length > 80 || password.length > 200) {
    return sendJson(res, 401, { error: 'Incorrect username or password.' });
  }

  const ip = req.socket.remoteAddress || 'local';
  const key = `${ip}|${username.toLowerCase()}`;
  const lockedFor = lockSeconds(key);
  if (lockedFor > 0) {
    return sendJson(res, 429, { error: `Too many attempts. Try again in ${lockedFor} seconds.` });
  }

  const user = db.prepare('SELECT id, username, password_hash, display_name, role, active, employee_id FROM users WHERE username = ?').get(username);
  const passwordOk = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || Number(user.active) !== 1 || !passwordOk) {
    noteFailure(key);
    console.log(`Login failed for "${username}" from ${ip}`);
    return sendJson(res, 401, { error: 'Incorrect username or password.' });
  }

  attempts.delete(key);
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  const token = createSession(Number(user.id));
  res.setHeader('Set-Cookie', sessionCookie(token));
  sendJson(res, 200, {
    user: {
      id: Number(user.id),
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      employeeId: user.employee_id === null || user.employee_id === undefined ? null : Number(user.employee_id),
    },
  });
}

function handleLogout(req, res) {
  const token = parseCookies(req.headers.cookie).hrms_session;
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  sendJson(res, 200, { ok: true });
}

function handleMe(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      employeeId: user.employeeId,
    },
  });
}

function handleDashboard(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  const employees = employeesPayload(listEmployees(url.searchParams.get('q') || ''));
  sendJson(res, 200, { stats: dashboardStats(), employees, attention: dashboardAttention() });
}

function dashboardAttention() {
  const reminders = reminderPayload();
  const expat = expatriatePayload();
  return {
    birthdays: reminders.birthdays.filter((item) => item.days <= 7).length,
    expiringPermits: expat.stats.expiringPermits,
    expiredDocuments: expat.stats.expiredDocuments,
    openTasks: reminders.tasks.filter((task) => !task.done).length,
    overdueTasks: reminders.tasks.filter((task) => !task.done && task.daysLeft !== null && task.daysLeft < 0).length,
  };
}

function handleGetLogo(res) {
  let body;
  let type;
  const savedType = getSetting('logo.mime');
  if (savedType && fs.existsSync(LOGO_PATH)) {
    body = fs.readFileSync(LOGO_PATH);
    type = savedType;
  } else {
    body = fs.readFileSync(path.join(PUBLIC_DIR, 'assets', 'logo.svg'));
    type = 'image/svg+xml';
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': 'no-store' });
  res.end(body);
}

async function handleSetLogo(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  if (user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Only an administrator can change the logo.' });
  }

  const body = await readJson(req, 3 * 1024 * 1024);
  const dataUrl = String(body.dataUrl || '');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return sendJson(res, 400, { error: 'Choose a PNG, JPG or WebP image.' });

  const mime = `image/${match[1]}`;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_LOGO_BYTES) {
    return sendJson(res, 413, { error: 'The image must be 1.5 MB or smaller.' });
  }

  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const matchesType = (mime === 'image/png' && isPng) || (mime === 'image/jpeg' && isJpeg) || (mime === 'image/webp' && isWebp);
  if (!matchesType) return sendJson(res, 400, { error: 'That file is not a valid image.' });

  fs.writeFileSync(LOGO_PATH, buffer);
  setSetting('logo.mime', mime);
  sendJson(res, 200, { ok: true, version: Date.now() });
}

function handleGetBranding(req, res) {
  sendJson(res, 200, { companyName: companyName() });
}

async function handleSetBranding(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  if (user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Only an administrator can change the company name.' });
  }

  const body = await readJson(req);
  const name = String(body.companyName || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) {
    return sendJson(res, 400, { error: 'Enter a company name between 2 and 60 characters.' });
  }

  setSetting('company.name', name);
  sendJson(res, 200, { ok: true, companyName: name });
}

/* ---------- Backups ---------- */

const BACKUP_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.db$/;

function backupRows() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => BACKUP_NAME.test(name))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function createBackup(prefix) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
  const name = `${prefix}-${stamp}.db`;
  const target = path.join(BACKUP_DIR, name);
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const stat = fs.statSync(target);
  return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
}

function handleListBackups(req, res) {
  const user = requireAdmin(req, res);
  if (!user) return;
  sendJson(res, 200, { backups: backupRows() });
}

function handleCreateBackup(req, res) {
  const user = requireAdmin(req, res);
  if (!user) return;
  const backup = createBackup('hrms-backup');
  sendJson(res, 201, { backup, backups: backupRows() });
}

function backupFile(name) {
  if (!BACKUP_NAME.test(name)) return null;
  const file = path.join(BACKUP_DIR, name);
  return fs.existsSync(file) ? file : null;
}

function handleDownloadBackup(req, res, name) {
  const user = requireAdmin(req, res);
  if (!user) return;
  const file = backupFile(name);
  if (!file) return sendText(res, 404, 'That backup no longer exists.');
  sendBlob(res, 'application/octet-stream', name, fs.readFileSync(file), false);
}

function handleRestoreBackup(req, res, name) {
  const user = requireAdmin(req, res);
  if (!user) return;
  const file = backupFile(name);
  if (!file) return sendJson(res, 404, { error: 'That backup no longer exists.' });

  let candidate;
  try {
    candidate = new DatabaseSync(file, { readOnly: true });
    const tables = new Set(
      candidate.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name)
    );
    if (!['users', 'employees', 'departments', 'settings'].every((table) => tables.has(table))) {
      return sendJson(res, 400, { error: 'That file is not a Docker HRMS backup.' });
    }
    if (!candidate.prepare("SELECT id FROM users WHERE role = 'admin' AND active = 1 LIMIT 1").get()) {
      return sendJson(res, 400, { error: 'That backup has no active administrator account, so it was not restored.' });
    }
    if (candidate.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') {
      return sendJson(res, 400, { error: 'That backup failed its integrity check, so it was not restored.' });
    }
  } catch {
    return sendJson(res, 400, { error: 'That file is not a readable database.' });
  } finally {
    if (candidate) candidate.close();
  }

  const safety = createBackup('pre-restore');
  db.close();
  try {
    for (const suffix of ['-wal', '-shm']) {
      try {
        fs.rmSync(DB_PATH + suffix, { force: true });
      } catch {}
    }
    const incoming = `${DB_PATH}.restore`;
    fs.copyFileSync(file, incoming);
    fs.renameSync(incoming, DB_PATH);
  } catch {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    return sendJson(res, 500, { error: 'The backup could not be copied into place. The current data is unchanged.' });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  try {
    createSchema(db);
    migrateSchema();
  } catch (err) {
    console.error('Schema upgrade after restore failed:', err);
    return sendJson(res, 500, { error: 'The backup was restored but its tables could not be upgraded. Restart Docker HRMS.' });
  }
  db.prepare('DELETE FROM sessions').run();

  sendJson(res, 200, {
    ok: true,
    restored: name,
    safetyBackup: safety.name,
    message: 'The backup was restored. Sign in again to continue.',
  });
}

async function handleChangePassword(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readJson(req);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return sendJson(res, 400, { error: 'Enter your current and new password.' });
  }
  if (newPassword.length < 8) {
    return sendJson(res, 400, { error: 'The new password must be at least 8 characters.' });
  }
  if (newPassword.length > 200) {
    return sendJson(res, 400, { error: 'That password is too long.' });
  }

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
  if (!row || !verifyPassword(currentPassword, row.password_hash)) {
    return sendJson(res, 400, { error: 'Your current password is incorrect.' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), user.id);

  const token = parseCookies(req.headers.cookie).hrms_session;
  if (token) {
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(user.id, sha256(token));
  }
  sendJson(res, 200, { ok: true });
}

/* ---------- Users and roles ---------- */

const USER_ROLES = ['admin', 'hr', 'head', 'nurse', 'viewer'];

function userRows() {
  return db.prepare(
    `SELECT u.id, u.username, u.display_name, u.role, u.active, u.created_at, u.last_login_at,
            u.employee_id, e.full_name AS employee_name, e.department AS employee_department
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id
      ORDER BY u.username COLLATE NOCASE ASC`
  ).all().map((row) => ({
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: Number(row.active) === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || '',
    employeeId: row.employee_id === null || row.employee_id === undefined ? null : Number(row.employee_id),
    employeeName: row.employee_name || '',
    employeeDepartment: row.employee_department || '',
  }));
}

function userEmployeeId(value) {
  if (value === '' || value === null || value === undefined) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return db.prepare('SELECT id FROM employees WHERE id = ?').get(id) ? id : undefined;
}

function readUserRole(value) {
  const role = String(value || '').toLowerCase();
  return USER_ROLES.includes(role) ? role : null;
}

function passwordProblem(value) {
  const password = String(value || '');
  if (password.length < 8) return 'The password must be at least 8 characters.';
  if (password.length > 200) return 'That password is too long.';
  return null;
}

function otherActiveAdmins(id) {
  return Number(
    db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1 AND id <> ?").get(id).c
  );
}

function handleListUsers(req, res) {
  const user = requireAdmin(req, res);
  if (!user) return;
  sendJson(res, 200, { users: userRows(), roles: USER_ROLES });
}

async function handleCreateUser(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const body = await readJson(req);
  const username = String(body.username || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim();
  const role = readUserRole(body.role);

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return sendJson(res, 400, { error: 'Username must be 3–40 characters: letters, numbers, dots, dashes or underscores.' });
  }
  if (!displayName || displayName.length > 80) {
    return sendJson(res, 400, { error: 'Enter a display name (80 characters max).' });
  }
  if (!role) return sendJson(res, 400, { error: 'Choose a valid role.' });
  const problem = passwordProblem(body.password);
  if (problem) return sendJson(res, 400, { error: problem });

  const employeeId = userEmployeeId(body.employeeId);
  if (employeeId === undefined) {
    return sendJson(res, 400, { error: 'Choose a valid employee to link.' });
  }
  if (role === 'head' && !employeeId) {
    return sendJson(res, 400, { error: 'A department head account must be linked to an employee.' });
  }

  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return sendJson(res, 409, { error: 'That username is already taken.' });
  }

  const result = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role, employee_id) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hashPassword(String(body.password)), displayName, role, employeeId);
  sendJson(res, 201, { user: userRows().find((row) => row.id === Number(result.lastInsertRowid)) });
}

async function handleUpdateUser(req, res, id) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const current = db.prepare('SELECT id, username, display_name, role, active FROM users WHERE id = ?').get(id);
  if (!current) return sendJson(res, 404, { error: 'That user no longer exists.' });

  const body = await readJson(req);
  const isSelf = Number(current.id) === Number(admin.id);

  let displayName = current.display_name;
  if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
    displayName = String(body.displayName || '').trim();
    if (!displayName || displayName.length > 80) {
      return sendJson(res, 400, { error: 'Enter a display name (80 characters max).' });
    }
  }

  let role = current.role;
  if (Object.prototype.hasOwnProperty.call(body, 'role')) {
    role = readUserRole(body.role);
    if (!role) return sendJson(res, 400, { error: 'Choose a valid role.' });
  }

  let active = Number(current.active) === 1;
  if (Object.prototype.hasOwnProperty.call(body, 'active')) active = Boolean(body.active);

  let employeeId = current.employee_id === null || current.employee_id === undefined ? null : Number(current.employee_id);
  if (Object.prototype.hasOwnProperty.call(body, 'employeeId')) {
    employeeId = userEmployeeId(body.employeeId);
    if (employeeId === undefined) return sendJson(res, 400, { error: 'Choose a valid employee to link.' });
  }
  if (role === 'head' && !employeeId) {
    return sendJson(res, 400, { error: 'A department head account must be linked to an employee.' });
  }

  if (isSelf && (!active || role !== 'admin')) {
    return sendJson(res, 400, { error: 'You cannot remove your own administrator access.' });
  }
  const losesAdmin = current.role === 'admin' && Number(current.active) === 1 && (role !== 'admin' || !active);
  if (losesAdmin && otherActiveAdmins(current.id) === 0) {
    return sendJson(res, 400, { error: 'At least one active administrator is required.' });
  }

  db.prepare(
    "UPDATE users SET display_name = ?, role = ?, active = ?, employee_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(displayName, role, active ? 1 : 0, employeeId, id);
  if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

  sendJson(res, 200, { user: userRows().find((row) => row.id === Number(id)) });
}

async function handleResetUserPassword(req, res, id) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!row) return sendJson(res, 404, { error: 'That user no longer exists.' });

  const body = await readJson(req);
  const problem = passwordProblem(body.password);
  if (problem) return sendJson(res, 400, { error: problem });

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hashPassword(String(body.password)), id);
  if (Number(id) !== Number(admin.id)) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

  sendJson(res, 200, { ok: true });
}

function handleListEmployees(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  const employees = employeeDirectory(
    url.searchParams.get('q') || '',
    url.searchParams.get('department') || '',
    url.searchParams.get('status') || '',
    url.searchParams.get('type') || ''
  );
  sendJson(res, 200, { employees });
}

function handleListDepartments(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, { departments: listDepartments() });
}

function normalizeDepartmentName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

async function handleCreateDepartment(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;

  const body = await readJson(req);
  const name = normalizeDepartmentName(body.name);
  if (!name) return sendJson(res, 400, { error: 'Enter a department name.' });
  if (name.length > 60) return sendJson(res, 400, { error: 'That department name is too long.' });
  if (name.toLowerCase() === 'unassigned') {
    return sendJson(res, 400, { error: '“Unassigned” is reserved for staff without a department.' });
  }
  if (db.prepare('SELECT id FROM departments WHERE name = ?').get(name)) {
    return sendJson(res, 409, { error: 'A department with that name already exists.' });
  }
  const headId = readHeadId(body);
  if (Number.isNaN(headId) || (headId !== null && !employeeExists(headId))) {
    return sendJson(res, 400, { error: 'Choose a valid head of department.' });
  }

  const result = db.prepare('INSERT INTO departments (name, head_employee_id) VALUES (?, ?)').run(name, headId);
  const department = listDepartments().find((row) => row.id === Number(result.lastInsertRowid));
  sendJson(res, 201, { department });
}

async function handleUpdateDepartment(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const current = db.prepare('SELECT id, name, system, head_employee_id FROM departments WHERE id = ?').get(id);
  if (!current) return sendJson(res, 404, { error: 'That department no longer exists.' });
  if (Number(current.system) === 1) {
    return sendJson(res, 400, { error: 'The Unassigned department cannot be changed.' });
  }

  const body = await readJson(req);
  const name = normalizeDepartmentName(body.name === undefined ? current.name : body.name);
  if (!name) return sendJson(res, 400, { error: 'Enter a department name.' });
  if (name.length > 60) return sendJson(res, 400, { error: 'That department name is too long.' });
  if (name.toLowerCase() === 'unassigned') {
    return sendJson(res, 400, { error: '“Unassigned” is reserved for staff without a department.' });
  }
  if (db.prepare('SELECT id FROM departments WHERE name = ? AND id <> ?').get(name, id)) {
    return sendJson(res, 409, { error: 'A department with that name already exists.' });
  }

  let headId = current.head_employee_id === null ? null : Number(current.head_employee_id);
  if (Object.prototype.hasOwnProperty.call(body, 'headEmployeeId')) {
    headId = readHeadId(body);
    if (Number.isNaN(headId) || (headId !== null && !employeeExists(headId))) {
      return sendJson(res, 400, { error: 'Choose a valid head of department.' });
    }
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    if (name !== current.name) {
      db.prepare('UPDATE employees SET department = ? WHERE department = ?').run(name, current.name);
    }
    db.prepare('UPDATE departments SET name = ?, head_employee_id = ? WHERE id = ?').run(name, headId, id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const department = listDepartments().find((row) => row.id === Number(id));
  sendJson(res, 200, { department });
}

function handleDeleteDepartment(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const current = db.prepare('SELECT id, name, system FROM departments WHERE id = ?').get(id);
  if (!current) return sendJson(res, 404, { error: 'That department no longer exists.' });
  if (Number(current.system) === 1) {
    return sendJson(res, 400, { error: 'The Unassigned department cannot be removed.' });
  }

  const staffCount = Number(
    db.prepare('SELECT COUNT(*) AS c FROM employees WHERE department = ?').get(current.name).c
  );

  let moved = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (staffCount > 0) {
      let unassigned = db.prepare('SELECT id, name FROM departments WHERE system = 1 LIMIT 1').get();
      if (!unassigned) {
        const inserted = db.prepare("INSERT INTO departments (name, system) VALUES ('Unassigned', 1)").run();
        unassigned = { id: Number(inserted.lastInsertRowid), name: 'Unassigned' };
      }
      moved = Number(
        db.prepare('UPDATE employees SET department = ?, unit = NULL WHERE department = ?').run(unassigned.name, current.name).changes
      );
    }
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  sendJson(res, 200, { ok: true, moved });
}

function normalizeUnitName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function validateUnitName(name, departmentId, excludeId) {
  if (!name) return 'Enter a unit name.';
  if (name.length > 60) return 'That unit name is too long.';
  const duplicate = excludeId
    ? db.prepare('SELECT id FROM units WHERE department_id = ? AND name = ? COLLATE NOCASE AND id <> ?').get(departmentId, name, excludeId)
    : db.prepare('SELECT id FROM units WHERE department_id = ? AND name = ? COLLATE NOCASE').get(departmentId, name);
  if (duplicate) return 'That department already has a unit with that name.';
  return null;
}

async function handleCreateUnit(req, res, departmentId) {
  const user = requireEditor(req, res);
  if (!user) return;

  const department = db.prepare('SELECT id, name, system FROM departments WHERE id = ?').get(departmentId);
  if (!department) return sendJson(res, 404, { error: 'That department no longer exists.' });
  if (Number(department.system) === 1) {
    return sendJson(res, 400, { error: 'The Unassigned department cannot have units.' });
  }

  const body = await readJson(req);
  const name = normalizeUnitName(body.name);
  const problem = validateUnitName(name, Number(departmentId), null);
  if (problem) return sendJson(res, problem.startsWith('That department already') ? 409 : 400, { error: problem });

  const result = db.prepare('INSERT INTO units (department_id, name) VALUES (?, ?)').run(Number(departmentId), name);
  sendJson(res, 201, {
    unit: { id: Number(result.lastInsertRowid), name, staffCount: 0 },
    department: listDepartments().find((row) => row.id === Number(departmentId)),
  });
}

async function handleUpdateUnit(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const current = db.prepare(
    `SELECT u.id, u.name, u.department_id, d.name AS department_name
       FROM units u JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?`
  ).get(id);
  if (!current) return sendJson(res, 404, { error: 'That unit no longer exists.' });

  const body = await readJson(req);
  const name = normalizeUnitName(body.name === undefined ? current.name : body.name);
  const problem = validateUnitName(name, Number(current.department_id), Number(id));
  if (problem) return sendJson(res, problem.startsWith('That department already') ? 409 : 400, { error: problem });

  db.exec('BEGIN IMMEDIATE');
  try {
    if (name !== current.name) {
      db.prepare('UPDATE employees SET unit = ? WHERE department = ? AND unit = ? COLLATE NOCASE')
        .run(name, current.department_name, current.name);
      db.prepare('UPDATE units SET name = ? WHERE id = ?').run(name, id);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  sendJson(res, 200, {
    unit: { id: Number(id), name, staffCount: Number(
      db.prepare('SELECT COUNT(*) AS c FROM employees WHERE department = ? AND unit = ? COLLATE NOCASE')
        .get(current.department_name, name).c
    ) },
    department: listDepartments().find((row) => row.id === Number(current.department_id)),
  });
}

function handleDeleteUnit(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const current = db.prepare(
    `SELECT u.id, u.name, u.department_id, d.name AS department_name
       FROM units u JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?`
  ).get(id);
  if (!current) return sendJson(res, 404, { error: 'That unit no longer exists.' });

  let moved = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    moved = Number(
      db.prepare('UPDATE employees SET unit = NULL WHERE department = ? AND unit = ? COLLATE NOCASE')
        .run(current.department_name, current.name).changes
    );
    db.prepare('DELETE FROM units WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  sendJson(res, 200, { ok: true, moved });
}

function handleListBank(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, 200, { employees: bankRows(url.searchParams.get('q') || '') });
}

async function handleUpdateBank(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  if (!bankRow(id)) return sendJson(res, 404, { error: 'That employee no longer exists.' });

  const body = await readJson(req);
  const bank = readBankFields(body);
  const problem = validateBankFields(bank);
  if (problem) return sendJson(res, 400, { error: problem });

  db.prepare(
    `UPDATE employees
        SET bank_name = ?, bank_branch = ?, account_name = ?, account_number = ?, ssnit_number = ?
      WHERE id = ?`
  ).run(
    bank.bankName || null, bank.bankBranch || null, bank.accountName || null,
    bank.accountNumber || null, bank.ssnitNumber || null, id
  );

  sendJson(res, 200, { employee: bankRow(id) });
}

/* ---------- Payroll ---------- */

/* ---------- Leave ---------- */

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Study', 'Unpaid', 'Compassionate'];
const LEAVE_PENDING = ['Pending head', 'Pending HR'];

function countWorkingDays(startOn, endOn) {
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

function leaveBalanceFor(employeeId, year) {
  const employee = db.prepare('SELECT id, leave_entitlement, leave_opening FROM employees WHERE id = ?').get(employeeId);
  if (!employee) return null;
  const entitlement = employee.leave_entitlement === null || employee.leave_entitlement === undefined
    ? null
    : round2(employee.leave_entitlement);
  const opening = round2(employee.leave_opening);
  const sums = db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'Approved' THEN working_days ELSE 0 END), 0) AS taken,
       COALESCE(SUM(CASE WHEN status = 'Pending head' OR status = 'Pending HR' THEN working_days ELSE 0 END), 0) AS pending
     FROM leave_requests
    WHERE employee_id = ? AND substr(start_on, 1, 4) = ?`
  ).get(employeeId, String(year));
  const taken = round2(sums.taken);
  const pending = round2(sums.pending);
  return {
    year: Number(year),
    entitlement,
    opening,
    taken,
    pending,
    remaining: entitlement === null ? null : round2(entitlement - opening - taken),
  };
}

function departmentHeadFor(department) {
  const row = db.prepare(
    `SELECT e.id, e.full_name
       FROM departments d JOIN employees e ON e.id = d.head_employee_id
      WHERE d.name = ? COLLATE NOCASE`
  ).get(department);
  return row ? { id: Number(row.id), name: row.full_name } : null;
}

function userHeadsDepartment(user, department) {
  if (!user.employeeId) return false;
  return Boolean(
    db.prepare('SELECT 1 FROM departments WHERE name = ? COLLATE NOCASE AND head_employee_id = ?')
      .get(department, user.employeeId)
  );
}

const LEAVE_QUERY = `
  SELECT l.*, e.staff_id, e.full_name,
         req.display_name AS requested_by_name,
         hu.display_name AS head_by_name,
         dec.display_name AS decided_by_name,
         he.full_name AS head_name
    FROM leave_requests l
    JOIN employees e ON e.id = l.employee_id
    LEFT JOIN users req ON req.id = l.requested_by
    LEFT JOIN users hu ON hu.id = l.head_user_id
    LEFT JOIN users dec ON dec.id = l.decided_by
    LEFT JOIN employees he ON he.id = l.head_employee_id`;

function leaveRequestRow(id) {
  return db.prepare(`${LEAVE_QUERY} WHERE l.id = ?`).get(id);
}

function leaveRequestPayload(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department,
    leaveType: row.leave_type,
    startOn: row.start_on,
    endOn: row.end_on,
    workingDays: round2(row.working_days),
    reason: row.reason || '',
    status: row.status,
    requestedByName: row.requested_by_name || '',
    requestedAt: row.requested_at,
    headName: row.head_name || '',
    headNote: row.head_note || '',
    headDecidedAt: row.head_decided_at || '',
    headByName: row.head_by_name || '',
    decidedByName: row.decided_by_name || '',
    decidedAt: row.decided_at || '',
    decisionNote: row.decision_note || '',
  };
}

function overlappingLeave(employeeId, startOn, endOn, excludeId) {
  return db.prepare(
    `SELECT id FROM leave_requests
      WHERE employee_id = ? AND id <> ?
        AND status IN ('Pending head', 'Pending HR', 'Approved')
        AND start_on <= ? AND end_on >= ?
      LIMIT 1`
  ).get(employeeId, excludeId || 0, endOn, startOn);
}

function handleListLeave(req, res, url) {
  const user = requireUser(req, res);
  if (!user) return;
  const requested = String(url.searchParams.get('year') || '');
  const year = /^\d{4}$/.test(requested) ? requested : String(new Date().getFullYear());

  let rows;
  if (user.role === 'head') {
    const departments = user.employeeId
      ? db.prepare('SELECT name FROM departments WHERE head_employee_id = ?').all(user.employeeId).map((row) => row.name)
      : [];
    if (!departments.length) {
      rows = [];
    } else {
      const marks = departments.map(() => '?').join(', ');
      rows = db.prepare(
        `${LEAVE_QUERY} WHERE substr(l.start_on, 1, 4) = ? AND l.department IN (${marks})
          ORDER BY l.start_on DESC, l.id DESC`
      ).all(year, ...departments);
    }
  } else {
    rows = db.prepare(
      `${LEAVE_QUERY} WHERE substr(l.start_on, 1, 4) = ? ORDER BY l.start_on DESC, l.id DESC`
    ).all(year);
  }

  sendJson(res, 200, {
    year: Number(year),
    requests: rows.map(leaveRequestPayload),
    balance: user.employeeId ? leaveBalanceFor(user.employeeId, year) : null,
  });
}

function handleLeaveBalance(req, res, employeeId, url) {
  const user = requireUser(req, res);
  if (!user) return;
  const requested = String(url.searchParams.get('year') || '');
  const year = /^\d{4}$/.test(requested) ? requested : String(new Date().getFullYear());
  const employee = db.prepare('SELECT id, staff_id, full_name FROM employees WHERE id = ?').get(employeeId);
  if (!employee) return sendJson(res, 404, { error: 'That employee no longer exists.' });
  sendJson(res, 200, {
    employee: { id: Number(employee.id), staffId: employee.staff_id, fullName: employee.full_name },
    balance: leaveBalanceFor(employeeId, year),
  });
}

async function handleCreateLeave(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;

  const body = await readJson(req);
  const employee = db.prepare('SELECT id, staff_id, full_name, department, status FROM employees WHERE id = ?')
    .get(Number(body.employeeId));
  if (!employee) return sendJson(res, 400, { error: 'Choose an employee.' });
  if (employee.status !== 'Active') return sendJson(res, 400, { error: 'Only active employees can take leave.' });

  const leaveType = String(body.leaveType || '');
  if (!LEAVE_TYPES.includes(leaveType)) return sendJson(res, 400, { error: 'Choose a leave type.' });

  const startOn = String(body.startOn || '');
  const endOn = String(body.endOn || '');
  if (!isIsoDate(startOn) || !isIsoDate(endOn)) {
    return sendJson(res, 400, { error: 'Choose valid start and end dates.' });
  }
  if (endOn < startOn) return sendJson(res, 400, { error: 'The end date must be on or after the start date.' });

  const span = Math.round((Date.parse(`${endOn}T00:00:00Z`) - Date.parse(`${startOn}T00:00:00Z`)) / 86400000);
  if (span > 366) return sendJson(res, 400, { error: 'A leave request cannot span more than a year.' });

  const workingDays = countWorkingDays(startOn, endOn);
  if (!workingDays) {
    return sendJson(res, 400, { error: 'That range has no working days. Pick dates that include a Monday to Friday.' });
  }

  if (overlappingLeave(employee.id, startOn, endOn, 0)) {
    return sendJson(res, 409, { error: 'This employee already has leave covering part of those dates.' });
  }

  const year = startOn.slice(0, 4);
  if (leaveType === 'Annual') {
    const balance = leaveBalanceFor(employee.id, year);
    if (balance && balance.remaining !== null) {
      const available = round2(balance.remaining - balance.pending);
      if (workingDays > available) {
        const waiting = balance.pending
          ? ` ${balance.pending} ${balance.pending === 1 ? 'day is' : 'days are'} already awaiting a decision.`
          : '';
        return sendJson(res, 400, {
          error: `This request needs ${workingDays} working days but only ${round2(available)} remain for ${year}.${waiting}`,
        });
      }
    }
  }

  const head = departmentHeadFor(employee.department);
  const status = head && head.id !== Number(employee.id) ? 'Pending head' : 'Pending HR';
  const reason = String(body.reason || '').trim().slice(0, 200);

  const result = db.prepare(
    `INSERT INTO leave_requests
       (employee_id, department, head_employee_id, leave_type, start_on, end_on, working_days, reason, status, requested_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    employee.id, employee.department, head ? head.id : null, leaveType,
    startOn, endOn, workingDays, reason || null, status, user.id
  );

  sendJson(res, 201, { request: leaveRequestPayload(leaveRequestRow(Number(result.lastInsertRowid))) });
}

async function handleRecommendLeave(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare('SELECT id, department, status FROM leave_requests WHERE id = ?').get(id);
  if (!row) return sendJson(res, 404, { error: 'That leave request no longer exists.' });
  if (row.status !== 'Pending head') {
    return sendJson(res, 409, { error: 'This request is not waiting for the department head.' });
  }
  const allowed = user.role === 'admin' || user.role === 'hr' || userHeadsDepartment(user, row.department);
  if (!allowed) {
    return sendJson(res, 403, { error: 'Only the department head or HR can recommend this request.' });
  }

  const body = await readJson(req);
  const note = String(body.note || '').trim().slice(0, 200);
  db.prepare(
    "UPDATE leave_requests SET status = 'Pending HR', head_user_id = ?, head_note = ?, head_decided_at = datetime('now') WHERE id = ?"
  ).run(user.id, note || null, id);

  sendJson(res, 200, { request: leaveRequestPayload(leaveRequestRow(id)) });
}

async function handleConfirmLeave(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const row = db.prepare(
    'SELECT id, employee_id, leave_type, start_on, end_on, working_days, status FROM leave_requests WHERE id = ?'
  ).get(id);
  if (!row) return sendJson(res, 404, { error: 'That leave request no longer exists.' });
  if (row.status === 'Pending head') {
    return sendJson(res, 409, { error: 'The department head has not recommended this request yet.' });
  }
  if (row.status !== 'Pending HR') {
    return sendJson(res, 409, { error: 'This request is already decided.' });
  }
  if (overlappingLeave(row.employee_id, row.start_on, row.end_on, row.id)) {
    return sendJson(res, 409, { error: 'Another request covering part of those dates was approved first.' });
  }

  if (row.leave_type === 'Annual') {
    const balance = leaveBalanceFor(row.employee_id, row.start_on.slice(0, 4));
    if (balance && balance.remaining !== null) {
      const others = round2(balance.pending - row.working_days);
      const available = round2(balance.remaining - others);
      if (row.working_days > available) {
        return sendJson(res, 409, {
          error: `Only ${available} annual ${available === 1 ? 'day remains' : 'days remain'} for that year, so this request can no longer be approved.`,
        });
      }
    }
  }

  const body = await readJson(req);
  const note = String(body.note || '').trim().slice(0, 200);
  db.prepare(
    "UPDATE leave_requests SET status = 'Approved', decided_by = ?, decided_at = datetime('now'), decision_note = ? WHERE id = ?"
  ).run(user.id, note || null, id);

  sendJson(res, 200, { request: leaveRequestPayload(leaveRequestRow(id)) });
}

async function handleRejectLeave(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare('SELECT id, department, status FROM leave_requests WHERE id = ?').get(id);
  if (!row) return sendJson(res, 404, { error: 'That leave request no longer exists.' });
  if (row.status !== 'Pending head' && row.status !== 'Pending HR') {
    return sendJson(res, 409, { error: 'This request is already decided.' });
  }

  const isHr = user.role === 'admin' || user.role === 'hr';
  const isHeadStep = row.status === 'Pending head' && userHeadsDepartment(user, row.department);
  if (!isHr && !isHeadStep) {
    return sendJson(res, 403, { error: 'Only HR or the department head can reject this request.' });
  }

  const body = await readJson(req);
  const note = String(body.note || '').trim().slice(0, 200);
  db.prepare(
    "UPDATE leave_requests SET status = 'Rejected', decided_by = ?, decided_at = datetime('now'), decision_note = ? WHERE id = ?"
  ).run(user.id, note || null, id);

  sendJson(res, 200, { request: leaveRequestPayload(leaveRequestRow(id)) });
}

// GRA monthly PAYE bands (2024 annual bands divided by 12).
const PAYE_BANDS = [
  { width: 490, rate: 0 },
  { width: 110, rate: 0.05 },
  { width: 130, rate: 0.1 },
  { width: 3166.67, rate: 0.175 },
  { width: 16000, rate: 0.25 },
  { width: 30520, rate: 0.3 },
  { width: Infinity, rate: 0.35 },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const MONEY_TEXT = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function moneyText(value) {
  return `GH₵${MONEY_TEXT.format(Number(value) || 0)}`;
}

function computePaye(taxable) {
  let remaining = Math.max(0, Number(taxable) || 0);
  let tax = 0;
  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, band.width);
    tax += slice * band.rate;
    remaining -= slice;
  }
  return round2(tax);
}

function payrollFigures(amounts) {
  const basic = round2(amounts.basicSalary);
  const gross = round2(basic + round2(amounts.housingAllowance) + round2(amounts.transportAllowance) + round2(amounts.otherAllowance));
  const ssnitEmployee = round2(basic * 0.055);
  const ssnitEmployer = round2(basic * 0.13);
  const paye = computePaye(round2(gross - ssnitEmployee));
  const net = round2(gross - ssnitEmployee - paye - round2(amounts.otherDeductions));
  return { gross, ssnitEmployee, ssnitEmployer, paye, net };
}

function payrollPeriodLabel(period) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period || ''));
  if (!match) return String(period || '');
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

function payrollItemPayload(row) {
  return {
    id: Number(row.id),
    employeeId: row.employee_id === null || row.employee_id === undefined ? null : Number(row.employee_id),
    staffId: row.staff_id,
    fullName: row.full_name,
    department: row.department || '',
    position: row.position || '',
    bankName: row.bank_name || '',
    bankBranch: row.bank_branch || '',
    accountName: row.account_name || '',
    accountNumber: row.account_number || '',
    ssnitNumber: row.ssnit_number || '',
    basicSalary: round2(row.basic_salary),
    housingAllowance: round2(row.housing_allowance),
    transportAllowance: round2(row.transport_allowance),
    otherAllowance: round2(row.other_allowance),
    otherDeductions: round2(row.other_deductions),
    otherDeductionNote: row.other_deduction_note || '',
    gross: round2(row.gross),
    ssnitEmployee: round2(row.ssnit_employee),
    ssnitEmployer: round2(row.ssnit_employer),
    paye: round2(row.paye),
    net: round2(row.net),
  };
}

function payrollRunSummary(row) {
  return {
    id: Number(row.id),
    period: row.period,
    label: payrollPeriodLabel(row.period),
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at || '',
    totals: {
      staffCount: Number(row.staff_count || 0),
      gross: round2(row.gross),
      ssnitEmployee: round2(row.ssnit_employee),
      ssnitEmployer: round2(row.ssnit_employer),
      paye: round2(row.paye),
      otherDeductions: round2(row.other_deductions),
      net: round2(row.net),
    },
    warningCount: Number(row.warning_count || 0),
  };
}

function payrollRunDetail(id) {
  const row = db.prepare(
    `SELECT r.id, r.period, r.status, r.created_at, r.approved_at,
            COUNT(i.id) AS staff_count,
            COALESCE(SUM(i.gross), 0) AS gross,
            COALESCE(SUM(i.ssnit_employee), 0) AS ssnit_employee,
            COALESCE(SUM(i.ssnit_employer), 0) AS ssnit_employer,
            COALESCE(SUM(i.paye), 0) AS paye,
            COALESCE(SUM(i.other_deductions), 0) AS other_deductions,
            COALESCE(SUM(i.net), 0) AS net
       FROM payroll_runs r
       LEFT JOIN payroll_items i ON i.run_id = r.id
      WHERE r.id = ?
      GROUP BY r.id`
  ).get(id);
  if (!row) return null;
  const items = db.prepare(
    'SELECT * FROM payroll_items WHERE run_id = ? ORDER BY full_name COLLATE NOCASE ASC, id ASC'
  ).all(id).map(payrollItemPayload);
  return { ...payrollRunSummary(row), items, warnings: payrollWarnings(items) };
}

function payrollWarnings(items) {
  const warnings = [];
  for (const item of items) {
    const missing = [];
    if (!item.ssnitNumber) missing.push('SSNIT number');
    if (!item.bankName || !item.accountNumber) missing.push('bank account');
    if (missing.length) warnings.push({ staffId: item.staffId, fullName: item.fullName, missing });
  }
  return warnings;
}

function handleListPayroll(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const rows = db.prepare(
    `SELECT r.id, r.period, r.status, r.created_at, r.approved_at,
            COUNT(i.id) AS staff_count,
            COALESCE(SUM(i.gross), 0) AS gross,
            COALESCE(SUM(i.ssnit_employee), 0) AS ssnit_employee,
            COALESCE(SUM(i.ssnit_employer), 0) AS ssnit_employer,
            COALESCE(SUM(i.paye), 0) AS paye,
            COALESCE(SUM(i.other_deductions), 0) AS other_deductions,
            COALESCE(SUM(i.net), 0) AS net,
            (SELECT COUNT(*) FROM payroll_items w
              WHERE w.run_id = r.id
                AND (COALESCE(w.ssnit_number, '') = ''
                     OR COALESCE(w.bank_name, '') = ''
                     OR COALESCE(w.account_number, '') = '')) AS warning_count
       FROM payroll_runs r
       LEFT JOIN payroll_items i ON i.run_id = r.id
      GROUP BY r.id
      ORDER BY r.period DESC`
  ).all();
  sendJson(res, 200, { runs: rows.map(payrollRunSummary) });
}

async function handleCreatePayrollRun(req, res) {
  const user = requireEditor(req, res);
  if (!user) return;

  const body = await readJson(req);
  const period = String(body.period || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return sendJson(res, 400, { error: 'Choose the month for this payroll run.' });
  }
  if (db.prepare('SELECT id FROM payroll_runs WHERE period = ?').get(period)) {
    return sendJson(res, 409, { error: `Payroll for ${payrollPeriodLabel(period)} already exists.` });
  }

  const active = db.prepare(
    `SELECT id, staff_id, full_name, department, position,
            bank_name, bank_branch, account_name, account_number, ssnit_number,
            COALESCE(basic_salary, 0) AS basic_salary,
            COALESCE(housing_allowance, 0) AS housing_allowance,
            COALESCE(transport_allowance, 0) AS transport_allowance,
            COALESCE(other_allowance, 0) AS other_allowance
       FROM employees
      WHERE status = 'Active'
      ORDER BY full_name COLLATE NOCASE ASC`
  ).all();
  const paid = active.filter((row) => Number(row.basic_salary) > 0);
  if (!paid.length) {
    return sendJson(res, 400, { error: 'No active employee has a basic salary yet. Add salaries in Employees first.' });
  }

  let runId;
  db.exec('BEGIN IMMEDIATE');
  try {
    runId = Number(db.prepare('INSERT INTO payroll_runs (period) VALUES (?)').run(period).lastInsertRowid);
    const insert = db.prepare(
      `INSERT INTO payroll_items
         (run_id, employee_id, staff_id, full_name, department, position, bank_name, bank_branch,
          account_name, account_number, ssnit_number, basic_salary, housing_allowance, transport_allowance,
          other_allowance, gross, ssnit_employee, ssnit_employer, paye, net)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of paid) {
      const amounts = {
        basicSalary: row.basic_salary,
        housingAllowance: row.housing_allowance,
        transportAllowance: row.transport_allowance,
        otherAllowance: row.other_allowance,
        otherDeductions: 0,
      };
      const figures = payrollFigures(amounts);
      insert.run(
        runId, Number(row.id), row.staff_id, row.full_name,
        row.department || '', row.position || '',
        row.bank_name || '', row.bank_branch || '', row.account_name || '', row.account_number || '',
        row.ssnit_number || '',
        round2(row.basic_salary), round2(row.housing_allowance), round2(row.transport_allowance), round2(row.other_allowance),
        figures.gross, figures.ssnitEmployee, figures.ssnitEmployer, figures.paye, figures.net
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const run = payrollRunDetail(runId);
  sendJson(res, 201, { run, skipped: active.length - paid.length, warnings: run.warnings });
}

function handleGetPayrollRun(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const run = payrollRunDetail(id);
  if (!run) return sendJson(res, 404, { error: 'That payroll run no longer exists.' });
  sendJson(res, 200, { run });
}

async function handleUpdatePayrollItem(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;

  const item = db.prepare(
    `SELECT i.id, i.run_id, r.status AS run_status
       FROM payroll_items i JOIN payroll_runs r ON r.id = i.run_id
      WHERE i.id = ?`
  ).get(id);
  if (!item) return sendJson(res, 404, { error: 'That payslip no longer exists.' });
  if (item.run_status !== 'Draft') {
    return sendJson(res, 409, { error: 'This payroll is approved. Reopen it before editing.' });
  }

  const body = await readJson(req);
  const errors = [];
  const amounts = {};
  const readAmount = (key, label) => {
    const raw = body[key];
    if (raw === '' || raw === null || raw === undefined) return 0;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 10000000) {
      errors.push(`${label} must be between 0 and 10,000,000.`);
      return 0;
    }
    return round2(value);
  };

  amounts.basicSalary = readAmount('basicSalary', 'Basic salary');
  amounts.housingAllowance = readAmount('housingAllowance', 'Housing allowance');
  amounts.transportAllowance = readAmount('transportAllowance', 'Transport allowance');
  amounts.otherAllowance = readAmount('otherAllowance', 'Other allowance');
  amounts.otherDeductions = readAmount('otherDeductions', 'Other deductions');
  const note = String(body.otherDeductionNote ?? '').trim().slice(0, 120);
  if (errors.length) return sendJson(res, 400, { error: errors[0] });

  const figures = payrollFigures(amounts);
  if (figures.net < 0) {
    const available = round2(figures.gross - figures.ssnitEmployee - figures.paye);
    return sendJson(res, 400, {
      error: `Other deductions cannot exceed ${moneyText(available)} — the pay left after SSNIT and PAYE.`,
    });
  }
  db.prepare(
    `UPDATE payroll_items
        SET basic_salary = ?, housing_allowance = ?, transport_allowance = ?, other_allowance = ?,
            other_deductions = ?, other_deduction_note = ?, gross = ?, ssnit_employee = ?, ssnit_employer = ?,
            paye = ?, net = ?
      WHERE id = ?`
  ).run(
    amounts.basicSalary, amounts.housingAllowance, amounts.transportAllowance, amounts.otherAllowance,
    amounts.otherDeductions, note || null, figures.gross, figures.ssnitEmployee, figures.ssnitEmployer,
    figures.paye, figures.net, id
  );

  sendJson(res, 200, { run: payrollRunDetail(Number(item.run_id)) });
}

function handleDeletePayrollRun(req, res, id) {
  const user = requireEditor(req, res);
  if (!user) return;
  const run = db.prepare('SELECT id, status FROM payroll_runs WHERE id = ?').get(id);
  if (!run) return sendJson(res, 404, { error: 'That payroll run no longer exists.' });
  if (run.status !== 'Draft') {
    return sendJson(res, 409, { error: 'Approved payroll cannot be deleted. Reopen it first.' });
  }
  db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(id);
  sendJson(res, 200, { ok: true });
}

function handleApprovePayrollRun(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  if (user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Only an administrator can approve payroll.' });
  }
  const run = db.prepare('SELECT id, status FROM payroll_runs WHERE id = ?').get(id);
  if (!run) return sendJson(res, 404, { error: 'That payroll run no longer exists.' });
  if (run.status !== 'Draft') return sendJson(res, 409, { error: 'This payroll is already approved.' });
  db.prepare("UPDATE payroll_runs SET status = 'Approved', approved_at = datetime('now') WHERE id = ?").run(id);
  sendJson(res, 200, { run: payrollRunDetail(id) });
}

function handleReopenPayrollRun(req, res, id) {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const run = db.prepare('SELECT id, status FROM payroll_runs WHERE id = ?').get(id);
  if (!run) return sendJson(res, 404, { error: 'That payroll run no longer exists.' });
  if (run.status === 'Draft') return sendJson(res, 409, { error: 'This payroll is still a draft.' });
  db.prepare("UPDATE payroll_runs SET status = 'Draft', approved_at = NULL WHERE id = ?").run(id);
  sendJson(res, 200, { run: payrollRunDetail(id) });
}

function handleGetPayslip(req, res, id) {
  const user = requireUser(req, res);
  if (!user) return;
  const row = db.prepare(
    `SELECT i.*, r.period, r.status AS run_status,
            e.position AS live_position, e.department AS live_department,
            e.ssnit_number AS live_ssnit_number, e.bank_name AS live_bank_name,
            e.account_number AS live_account_number
       FROM payroll_items i
       JOIN payroll_runs r ON r.id = i.run_id
       LEFT JOIN employees e ON e.id = i.employee_id
      WHERE i.id = ?`
  ).get(id);
  if (!row) return sendJson(res, 404, { error: 'That payslip no longer exists.' });
  sendJson(res, 200, {
    company: getSetting('company.name') || 'Docker HRMS',
    run: {
      id: Number(row.run_id),
      period: row.period,
      label: payrollPeriodLabel(row.period),
      status: row.run_status,
    },
    item: payrollItemPayload(row),
    employee: {
      position: row.position || row.live_position || '',
      department: row.department || row.live_department || '',
      ssnitNumber: row.ssnit_number || row.live_ssnit_number || '',
      bankName: row.bank_name || row.live_bank_name || '',
      accountNumber: row.account_number || row.live_account_number || '',
    },
  });
}

function nurseMayUse(method, pathname) {
  if (pathname === '/api/login' || pathname === '/api/logout' || pathname === '/api/me') return true;
  if (pathname === '/api/change-password') return true;
  if (pathname === '/api/branding' || pathname === '/api/logo') return method === 'GET';
  if (pathname === '/api/dashboard' || pathname === '/api/employees' || pathname === '/api/departments') {
    return method === 'GET';
  }
  if (pathname === '/api/health-records') return method === 'GET' || method === 'POST';
  if (/^\/api\/health-records\/\d+$/.test(pathname)) return method === 'DELETE';
  if (/^\/api\/health-records\/\d+\/file$/.test(pathname)) return method === 'GET' || method === 'HEAD';
  return false;
}

async function handleApi(req, res, url) {
  const sessionOwner = sessionUser(req);
  if (sessionOwner && sessionOwner.role === 'nurse' && !nurseMayUse(req.method, url.pathname)) {
    return sendJson(res, 403, { error: 'Nurse accounts can only view and manage health records.' });
  }

  const bankMatch = /^\/api\/employees\/(\d+)\/bank$/.exec(url.pathname);
  if (bankMatch) {
    if (req.method === 'PUT') return handleUpdateBank(req, res, Number(bankMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const userPasswordMatch = /^\/api\/users\/(\d+)\/password$/.exec(url.pathname);
  if (userPasswordMatch) {
    if (req.method === 'POST') return handleResetUserPassword(req, res, Number(userPasswordMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const userMatch = /^\/api\/users\/(\d+)$/.exec(url.pathname);
  if (userMatch) {
    if (req.method === 'PATCH') return handleUpdateUser(req, res, Number(userMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const photoMatch = /^\/api\/employees\/(\d+)\/photo$/.exec(url.pathname);
  if (photoMatch) {
    if (req.method === 'GET' || req.method === 'HEAD') return handleEmployeePhoto(req, res, Number(photoMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const documentsMatch = /^\/api\/employees\/(\d+)\/documents$/.exec(url.pathname);
  if (documentsMatch) {
    if (req.method === 'POST') return handleUploadDocument(req, res, Number(documentsMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const expatriateMatch = /^\/api\/employees\/(\d+)\/expatriate$/.exec(url.pathname);
  if (expatriateMatch) {
    if (req.method === 'PUT') return handleUpdateExpatriate(req, res, Number(expatriateMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const employeeMatch = /^\/api\/employees\/(\d+)$/.exec(url.pathname);
  if (employeeMatch) {
    const id = Number(employeeMatch[1]);
    if (req.method === 'GET') return handleGetEmployee(req, res, id);
    if (req.method === 'PUT') return handleSaveEmployee(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const documentDownloadMatch = /^\/api\/documents\/(\d+)\/download$/.exec(url.pathname);
  if (documentDownloadMatch) {
    if (req.method === 'GET' || req.method === 'HEAD') return handleDownloadDocument(req, res, Number(documentDownloadMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const documentMatch = /^\/api\/documents\/(\d+)$/.exec(url.pathname);
  if (documentMatch) {
    if (req.method === 'DELETE') return handleDeleteDocument(req, res, Number(documentMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const healthFileMatch = /^\/api\/health-records\/(\d+)\/file$/.exec(url.pathname);
  if (healthFileMatch) {
    if (req.method === 'GET' || req.method === 'HEAD') return handleHealthRecordFile(req, res, Number(healthFileMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const healthMatch = /^\/api\/health-records\/(\d+)$/.exec(url.pathname);
  if (healthMatch) {
    if (req.method === 'DELETE') return handleDeleteHealthRecord(req, res, Number(healthMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const trainingMatch = /^\/api\/training\/(\d+)$/.exec(url.pathname);
  if (trainingMatch) {
    const id = Number(trainingMatch[1]);
    if (req.method === 'PUT') return handleUpdateTraining(req, res, id);
    if (req.method === 'DELETE') return handleDeleteTraining(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const reminderMatch = /^\/api\/reminders\/(\d+)$/.exec(url.pathname);
  if (reminderMatch) {
    const id = Number(reminderMatch[1]);
    if (req.method === 'PATCH') return handleUpdateReminder(req, res, id);
    if (req.method === 'DELETE') return handleDeleteReminder(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const departmentMatch = /^\/api\/departments\/(\d+)$/.exec(url.pathname);
  if (departmentMatch) {
    const id = Number(departmentMatch[1]);
    if (req.method === 'PATCH') return handleUpdateDepartment(req, res, id);
    if (req.method === 'DELETE') return handleDeleteDepartment(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const departmentUnitsMatch = /^\/api\/departments\/(\d+)\/units$/.exec(url.pathname);
  if (departmentUnitsMatch) {
    if (req.method === 'POST') return handleCreateUnit(req, res, Number(departmentUnitsMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const unitMatch = /^\/api\/units\/(\d+)$/.exec(url.pathname);
  if (unitMatch) {
    const id = Number(unitMatch[1]);
    if (req.method === 'PATCH') return handleUpdateUnit(req, res, id);
    if (req.method === 'DELETE') return handleDeleteUnit(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const payrollApproveMatch = /^\/api\/payroll\/(\d+)\/approve$/.exec(url.pathname);
  if (payrollApproveMatch) {
    if (req.method === 'POST') return handleApprovePayrollRun(req, res, Number(payrollApproveMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const payrollReopenMatch = /^\/api\/payroll\/(\d+)\/reopen$/.exec(url.pathname);
  if (payrollReopenMatch) {
    if (req.method === 'POST') return handleReopenPayrollRun(req, res, Number(payrollReopenMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const payrollItemMatch = /^\/api\/payroll\/items\/(\d+)$/.exec(url.pathname);
  if (payrollItemMatch) {
    const id = Number(payrollItemMatch[1]);
    if (req.method === 'GET') return handleGetPayslip(req, res, id);
    if (req.method === 'PATCH') return handleUpdatePayrollItem(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const payrollRunMatch = /^\/api\/payroll\/(\d+)$/.exec(url.pathname);
  if (payrollRunMatch) {
    const id = Number(payrollRunMatch[1]);
    if (req.method === 'GET') return handleGetPayrollRun(req, res, id);
    if (req.method === 'DELETE') return handleDeletePayrollRun(req, res, id);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const leaveBalanceMatch = /^\/api\/leave\/balance\/(\d+)$/.exec(url.pathname);
  if (leaveBalanceMatch) {
    if (req.method === 'GET') return handleLeaveBalance(req, res, Number(leaveBalanceMatch[1]), url);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const leaveRecommendMatch = /^\/api\/leave\/(\d+)\/recommend$/.exec(url.pathname);
  if (leaveRecommendMatch) {
    if (req.method === 'POST') return handleRecommendLeave(req, res, Number(leaveRecommendMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const leaveConfirmMatch = /^\/api\/leave\/(\d+)\/confirm$/.exec(url.pathname);
  if (leaveConfirmMatch) {
    if (req.method === 'POST') return handleConfirmLeave(req, res, Number(leaveConfirmMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const leaveRejectMatch = /^\/api\/leave\/(\d+)\/reject$/.exec(url.pathname);
  if (leaveRejectMatch) {
    if (req.method === 'POST') return handleRejectLeave(req, res, Number(leaveRejectMatch[1]));
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const backupRestoreMatch = /^\/api\/admin\/backups\/([^/]+)\/restore$/.exec(url.pathname);
  if (backupRestoreMatch) {
    if (req.method === 'POST') return handleRestoreBackup(req, res, backupRestoreMatch[1]);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const backupDownloadMatch = /^\/api\/admin\/backups\/([^/]+)$/.exec(url.pathname);
  if (backupDownloadMatch) {
    if (req.method === 'GET') return handleDownloadBackup(req, res, backupDownloadMatch[1]);
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const key = `${req.method} ${url.pathname}`;
  switch (key) {
    case 'POST /api/login':
      return handleLogin(req, res);
    case 'POST /api/logout':
      return handleLogout(req, res);
    case 'GET /api/me':
      return handleMe(req, res);
    case 'GET /api/dashboard':
      return handleDashboard(req, res, url);
    case 'GET /api/users':
      return handleListUsers(req, res);
    case 'POST /api/users':
      return handleCreateUser(req, res);
    case 'POST /api/employees':
      return handleSaveEmployee(req, res, null);
    case 'GET /api/employees':
      return handleListEmployees(req, res, url);
    case 'GET /api/employees/next-id':
      return handleNextStaffId(req, res);
    case 'GET /api/training':
      return handleListTraining(req, res, url);
    case 'POST /api/training':
      return handleCreateTraining(req, res);
    case 'GET /api/health-records':
      return handleListHealthRecords(req, res, url);
    case 'POST /api/health-records':
      return handleCreateHealthRecord(req, res);
    case 'GET /api/expatriates':
      return handleListExpatriates(req, res);
    case 'GET /api/reminders':
      return handleListReminders(req, res);
    case 'POST /api/reminders':
      return handleCreateReminder(req, res);
    case 'GET /api/departments':
      return handleListDepartments(req, res);
    case 'POST /api/departments':
      return handleCreateDepartment(req, res);
    case 'GET /api/bank':
      return handleListBank(req, res, url);
    case 'GET /api/payroll':
      return handleListPayroll(req, res);
    case 'POST /api/payroll':
      return handleCreatePayrollRun(req, res);
    case 'GET /api/leave':
      return handleListLeave(req, res, url);
    case 'POST /api/leave':
      return handleCreateLeave(req, res);
    case 'GET /api/logo':
      return handleGetLogo(res);
    case 'POST /api/logo':
      return handleSetLogo(req, res);
    case 'GET /api/branding':
      return handleGetBranding(req, res);
    case 'PUT /api/branding':
      return handleSetBranding(req, res);
    case 'GET /api/admin/backups':
      return handleListBackups(req, res);
    case 'POST /api/admin/backups':
      return handleCreateBackup(req, res);
    case 'POST /api/change-password':
      return handleChangePassword(req, res);
    default:
      return sendJson(res, 404, { error: 'Not found.' });
  }
}

const server = http.createServer((req, res) => {
  applySecurityHeaders(res);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((err) => {
      console.error(err);
      if (!res.headersSent) {
        sendJson(res, err.status || 500, {
          error: err.status ? err.message : 'Something went wrong. Please try again.',
        });
      } else {
        res.end();
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed.');
  }

  if (pathname === '/') {
    if (sessionUser(req)) return redirect(res, '/app');
    return serveFile(res, path.join(PUBLIC_DIR, 'login.html'));
  }

  const appPages = new Set([
    '/app', '/employees', '/health-records', '/training', '/expatriates',
    '/reports', '/reminders', '/departments', '/payroll', '/leave', '/bank-ssnit', '/users', '/admin',
  ]);
  if (appPages.has(pathname)) {
    if (!sessionUser(req)) return redirect(res, '/');
    return serveFile(res, path.join(PUBLIC_DIR, 'app.html'));
  }

  if (pathname.startsWith('/assets/') || pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
    const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return sendText(res, 404, 'Not found.');
    return serveFile(res, filePath);
  }

  sendText(res, 404, 'Not found.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error(`If HRMS is already running, open http://localhost:${PORT}\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`Docker HRMS is running at http://localhost:${PORT}`);
  if (HOST === '0.0.0.0' || HOST === '::') {
    for (const nic of Object.values(os.networkInterfaces()).flat()) {
      if (nic && nic.family === 'IPv4' && !nic.internal) {
        console.log(`On the network:  http://${nic.address}:${PORT}`);
      }
    }
  }
  if (adminCreated) {
    console.log('First sign-in:  username  admin   password  Admin@123');
  }
  console.log('Press Ctrl+C to stop.');
  console.log('');

  if (process.argv.includes('--open')) {
    setTimeout(() => {
      exec(`start "" "http://localhost:${PORT}"`);
    }, 400);
  }
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
