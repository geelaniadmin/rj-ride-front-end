#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

const ROOT = __dirname;

const servers = [
  {
    name: "ride_prd",
    label: "  PRD",
    color: "\x1b[36m", // cyan
    cwd: path.join(ROOT, "ride_prd"),
    port: 3000,
  },
  {
    name: "vendor",
    label: "VENDOR",
    color: "\x1b[33m", // yellow
    cwd: path.join(ROOT, "ride-vendor-portal"),
    port: 3001,
  },
  {
    name: "ops",
    label: "   OPS",
    color: "\x1b[35m", // magenta
    cwd: path.join(ROOT, "ride-ops-portal"),
    port: 3002,
  },
];

const children = [];

function log(label, color, msg) {
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${dim}[${timestamp}]${reset} ${color}[${label}]${reset} ${msg}`);
}

function startServer(srv) {
  log(srv.label, srv.color, `Starting on port ${srv.port}...`);

  const child = spawn("npx", ["next", "dev", "--port", String(srv.port)], {
    cwd: srv.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development" },
    shell: true,
  });

  children.push(child);

  child.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    for (const line of lines) {
      if (!line) continue;
      log(srv.label, srv.color, line.trim());
    }
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      log(srv.label, srv.color, `\x1b[31m${text}\x1b[0m`);
    }
  });

  child.on("exit", (code, signal) => {
    if (signal !== "SIGTERM" && signal !== "SIGINT") {
      log(
        srv.label,
        srv.color,
        `Exited unexpectedly (code: ${code}, signal: ${signal})`
      );
    }
  });

  return child;
}

// Start all servers
for (const srv of servers) {
  startServer(srv);
}

// Graceful shutdown
function cleanup() {
  log("", "\x1b[31m", "\nShutting down all servers...");
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Print banner after a short delay
setTimeout(() => {
  const green = "\x1b[32m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  console.log("");
  console.log(
    `${green}${bold}══════════════════════════════════════════════════${reset}`
  );
  console.log(`${green}${bold}  All portals ready!                         ${reset}`);
  console.log(`${green}${bold}══════════════════════════════════════════════════${reset}`);
  console.log(`  ${bold}Main App${reset}    → http://localhost:3000`);
  console.log(`  ${bold}Ops Portal${reset}  → http://localhost:3000/ops/`);
  console.log(`  ${bold}Vendor Portal${reset} → http://localhost:3000/vendor/`);
  console.log(`  ${bold}Stop all${reset}     → Ctrl+C`);
  console.log(
    `${green}${bold}══════════════════════════════════════════════════${reset}`
  );
  console.log("");
}, 15000);
