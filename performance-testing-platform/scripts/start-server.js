#!/usr/bin/env node
'use strict';

const net = require('net');
const { execSync, spawn } = require('child_process');
const path = require('path');

const port = parseInt(process.env.PORT || '3000', 10);
const mode = process.argv[2] || 'cluster'; // 'cluster' or 'single'
const entryFile =
  mode === 'single'
    ? path.join(__dirname, '../src/server.js')
    : path.join(__dirname, '../src/cluster.js');

function getPortOwner(port) {
  try {
    const output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
    if (!output) return null;
    const pid = parseInt(output.split('\n')[0], 10);
    const cmdline = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8' }).trim();
    return { pid, cmdline };
  } catch {
    return null;
  }
}

const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const owner = getPortOwner(port);
    if (owner && owner.cmdline.includes('node') && owner.cmdline.includes('src/')) {
      console.log(`Server already running on port ${port} (PID: ${owner.pid}). Skipping start.`);
      process.exit(0);
    }
    console.error(`Port ${port} is in use by another process:`);
    console.error(
      `  PID: ${owner ? owner.pid : 'unknown'}, CMD: ${owner ? owner.cmdline : 'unknown'}`
    );
    process.exit(1);
  }
  console.error(`Port check failed: ${err.message}`);
  process.exit(1);
});

server.once('listening', () => {
  server.close(() => {
    console.log(`Starting server in ${mode} mode on port ${port}...`);
    const child = spawn('node', [entryFile], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    });
    child.on('error', (e) => {
      console.error(`Failed to start server: ${e.message}`);
      process.exit(1);
    });
  });
});

server.listen(port);
