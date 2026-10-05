import http from 'node:http';

import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const server = http.createServer(createApp({ config }));
// Bounded so a stalled client can't hold a connection past the AI deadline.
server.requestTimeout = config.requestDeadlineMs + 10_000;
server.headersTimeout = 15_000;

server.listen(config.port, () => {
  console.log(JSON.stringify({
    level: config.openRouterApiKey ? 'info' : 'warn',
    msg: config.openRouterApiKey ? 'listening' : 'listening without OPENROUTER_API_KEY; parse requests will return 503',
    port: config.port,
    model: config.model,
  }));
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
