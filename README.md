# Docker HRMS

An internal human-resources, leave, and payroll application built with Node.js and SQLite. It runs without npm packages or a build step and serves a browser-based interface from `public/`.

## Requirements

- Node.js 24 LTS or newer, including the built-in `node:sqlite` module.
- A current desktop browser.
- Windows batch scripts are included for local startup, restart, firewall access, and data reset.

## Quick start on Windows

1. Double-click `Start HRMS.bat`.
2. Open <http://localhost:3210>.
3. Create the first administrator account when the setup screen appears.

There is no default administrator username or password. After setup, sign in with the account you created and add the remaining users under **Users & roles**.

To run manually from a terminal:

```powershell
$env:HRMS_HOST = "127.0.0.1"
$env:HRMS_PORT = "3210"
node server.js
```

Add `--open` to launch the default browser automatically:

```powershell
node server.js --open
```

No `npm install` step is required.

## Network access

The server binds to `127.0.0.1` by default. To allow another device on the same network to connect:

1. Run `Allow network access.bat` as administrator to open inbound TCP port 3210.
2. Start HRMS with `HRMS_HOST=0.0.0.0`, or use `Start HRMS.bat`, which already sets this value.
3. Open the network address printed by the firewall script or server console.

Only expose HRMS on a trusted network. Use a reverse proxy with HTTPS for remote access.

### Secure remote access with Cloudflare Tunnel

For temporary access from another network without opening an inbound firewall port:

1. Install the Cloudflare Tunnel client from PowerShell or Command Prompt:

   ```powershell
   winget install --exact --id Cloudflare.cloudflared
   ```

2. Close and reopen the terminal so the updated `PATH` is available. Close any HRMS window started with `Start HRMS.bat` if you want tunnel-only access.
3. Run `Start secure tunnel.bat`. It starts HRMS on `127.0.0.1` when needed and refuses to expose the app until first-run administrator setup is complete locally.
4. Wait for cloudflared to print an HTTPS address, open it, and sign in normally.
5. Keep the tunnel window open. Press `Ctrl+C` to stop the tunnel and any local HRMS process started by the script.

Cloudflare encrypts the connection, and HRMS authentication still applies. The quick-tunnel address is public to anyone who has it, so treat it like a password and share it only with trusted users. The address changes between runs, and quick tunnels have no uptime guarantee; use a named Cloudflare tunnel with Access controls and a custom domain for permanent production access.

## Roles

| Role | Access |
| --- | --- |
| Admin | Full application access, user administration, and company branding. |
| HR | Employee administration, payroll, organisation-wide HR views, and leave approval at the HR stage. |
| Head | Read-only staff in the assigned department, department training, leave recommendations/declines, and leave applications for department staff. |
| Employee | The linked employee's own profile and leave records. |
| Supervisor | Read-only staff and leave records in the assigned department; can apply for leave for department staff but cannot approve or reject it. |
| General manager | HOD leave history and final approval or rejection at the GM stage. |
| Nurse | Health-record access only. |
| Viewer | Read-only access to permitted organisation views. |

Employee and head accounts must be linked to an employee record. Supervisor accounts must be assigned to a department.

## Leave workflow

- **Ordinary employee or supervisor application:** `Pending head` → `Pending HR` → `Approved` or `Rejected`.
- **HOD's own leave:** `Pending HR` for HR preapproval → `Pending GM` for final approval → `Approved` or `Rejected`.
- **HOD applying for another employee:** directly to `Pending HR`, then final HR approval; no GM stage.
- **No assigned HOD:** the request remains `Pending head`. HR can view it but cannot bypass or decide it.

Each stage records the decision-maker, timestamp, and optional note. Working days exclude weekends, and approved days update the employee's leave balance.

## Main features

- Employee records, departments, documents, training, health records, and dependants.
- Role-scoped dashboards and employee directories.
- Leave applications, entitlement balances, recommendations, and staged approvals.
- Payroll runs with editable SSNIT and PAYE settings, allowances, and other deductions.
- Bank and SSNIT exports, HR reports, reminders, and expatriate monitoring.
- Company name and logo configuration.

## Data and reset

HRMS stores its database and uploaded files in `data/`, which is excluded from Git:

```text
data/
  hrms.db
  logo.img
  backups/
```

`Reset HRMS data.bat` creates a timestamped database backup, then clears employees, departments, training, health records, reminders, documents, sessions, and non-admin users. Administrator accounts, the company name, and the logo are kept. Close the running server before resetting.

A brand-new database includes sample staff and starter non-admin accounts. Review or remove those accounts and sample records before using HRMS with real personnel data.

## Project structure

```text
server.js              HTTP API, authentication, database schema, and business rules
public/
  app.html             Application interface
  login.html           Sign-in and first-run setup interface
  css/styles.css       Responsive application styling
  js/app.js            Browser application logic
  js/login.js          Sign-in and setup logic
tools/reset-data.js    Interactive data-reset utility
tools/secure-tunnel.js Cloudflare Tunnel process manager
*.bat                  Windows startup and maintenance helpers
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HRMS_HOST` | `127.0.0.1` | Interface the server listens on. |
| `HRMS_PORT` | `3210` | HTTP port. |

## Maintenance checks

```powershell
node --check server.js
node --check public/js/app.js
node --check public/js/login.js
```

After changing backend code, restart HRMS with `Restart HRMS.bat`. If port 3210 is already in use, stop the existing HRMS process or set a different `HRMS_PORT`.
