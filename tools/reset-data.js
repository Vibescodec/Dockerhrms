'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'hrms.db');
const BACKUP_DIR = path.join(ROOT, 'data', 'backups');

if (!fs.existsSync(DB_PATH)) {
  console.error(`No database found at ${DB_PATH}.`);
  process.exit(1);
}

const TABLES = [
  'employee_documents',
  'employee_dependants',
  'employee_education',
  'employee_experience',
  'employee_referees',
  'training_records',
  'health_records',
  'reminders',
  'employees',
  'departments',
  'sessions',
];

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

const count = (table) => Number(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
const before = Object.fromEntries(TABLES.map((table) => [table, count(table)]));
const otherUsers = Number(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role <> 'admin'").get().n);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question(
  `This deletes ${before.employees} employees, ${before.training_records} training records, ` +
  `${before.reminders} reminders, ${before.departments} departments, ${otherUsers} other accounts ` +
  `and all sessions. The admin account, logo and company name are kept.\nType RESET to continue: `,
  (answer) => {
    rl.close();
    if (answer.trim() !== 'RESET') {
      console.log('Cancelled. Nothing was changed.');
      process.exit(1);
    }

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backup = path.join(BACKUP_DIR, `hrms-before-reset-${stamp}.db`);
    db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
    console.log(`Backup saved to ${backup}`);

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const table of TABLES) db.prepare(`DELETE FROM ${table}`).run();
      db.prepare("DELETE FROM users WHERE role <> 'admin'").run();
      db.prepare("UPDATE users SET active = 1 WHERE role = 'admin'").run();
      db.prepare(
        `DELETE FROM sqlite_sequence WHERE name IN (${TABLES.map(() => '?').join(', ')}, 'users')`
      ).run(...TABLES);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    console.log('\nCleared:');
    for (const table of TABLES) {
      console.log(`  ${table.padEnd(22)} ${before[table]} -> ${count(table)}`);
    }
    console.log(`  ${'other accounts'.padEnd(22)} ${otherUsers} -> 0`);
    console.log('\nAdministrator accounts kept. Use the username and password you created during setup.');
  }
);
