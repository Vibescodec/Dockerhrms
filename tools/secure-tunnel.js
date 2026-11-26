'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const port = Number(process.env.HRMS_PORT || 3210);
const cloudflared = process.env.CLOUDFLARED_EXE || 'cloudflared';
const origin = `http://127.0.0.1:${port}`;
let server;
let tunnel;
let stopping = false;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('HRMS_PORT must be a whole number between 1 and 65535.');
  process.exit(1);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function localStatus() {
  try {
    const response = await fetch(`${origin}/api/setup-status`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const status = await response.json();
    return typeof status.setupRequired === 'boolean' ? status : null;
  } catch {
    return null;
  }
}

function stopChild(child, name) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  console.log(`Stopping ${name}...`);
  child.kill();
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  stopChild(tunnel, 'Cloudflare Tunnel');
  stopChild(server, 'local HRMS');
  process.exitCode = code;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await localStatus();
    if (status) {
      if (status.setupRequired) {
        throw new Error(
          `Administrator setup is incomplete. Open ${origin}, create the first administrator, then retry.`
        );
      }
      return;
    }
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error('The local HRMS server stopped before the tunnel could start.');
    }
    await delay(250);
  }
  throw new Error(`HRMS did not become ready at ${origin}.`);
}

async function main() {
  const status = await localStatus();
  if (status) {
    if (status.setupRequired) {
      throw new Error(
        `Administrator setup is incomplete. Open ${origin}, create the first administrator, then retry.`
      );
    }
    console.log(`Using HRMS already running at ${origin}.`);
    console.log('If it was started with HRMS_HOST=0.0.0.0, LAN access is still enabled.');
  } else {
    console.log(`Starting local HRMS on ${origin}...`);
    server = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: { ...process.env, HRMS_HOST: '127.0.0.1', HRMS_PORT: String(port) },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    server.on('error', (error) => {
      console.error(`Could not start local HRMS: ${error.message}`);
      shutdown(1);
    });
    server.on('exit', (code, signal) => {
      if (!stopping) {
        console.error(`Local HRMS stopped unexpectedly (${signal || code}).`);
        shutdown(1);
      }
    });
    await waitForServer();
  }

  console.log('Starting Cloudflare HTTPS tunnel. No inbound firewall port is opened.');
  console.log('Keep this window open. The public HTTPS address will appear below.');
  console.log('Treat that address like a password and share it only with trusted users.');

  tunnel = spawn(cloudflared, ['tunnel', '--url', origin, '--no-autoupdate'], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  tunnel.on('error', (error) => {
    console.error(`Could not start Cloudflare Tunnel: ${error.message}`);
    shutdown(1);
  });
  tunnel.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`Cloudflare Tunnel stopped (${signal || code}).`);
      shutdown(code === 0 ? 0 : 1);
    }
  });
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

main().catch((error) => {
  console.error(error.message);
  shutdown(1);
});
