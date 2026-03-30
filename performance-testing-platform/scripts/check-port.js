#!/usr/bin/env node
'use strict';

const net = require('net');
const port = parseInt(process.env.PORT || '3000', 10);

const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set PORT env var to use a different port.`);
    process.exit(1);
  }
  console.error(`Port check failed: ${err.message}`);
  process.exit(1);
});

server.once('listening', () => {
  server.close(() => {
    console.log(`Port ${port} is available.`);
    process.exit(0);
  });
});

server.listen(port);
