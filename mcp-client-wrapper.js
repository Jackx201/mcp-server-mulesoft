#!/usr/bin/env node

const http = require('http');

// Conectar al SSE endpoint de MuleSoft
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/sse',
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream'
  }
};

const req = http.request(options, (res) => {
  // Reenviar eventos SSE a stdout
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  res.on('end', () => {
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error connecting to MuleSoft MCP server:', error);
  process.exit(1);
});

// Manejar stdin para mensajes del cliente
process.stdin.on('data', (data) => {
  // Aquí deberías enviar el mensaje al endpoint /message
  // pero para SSE simple, MCP maneja esto automáticamente
});

req.end();
