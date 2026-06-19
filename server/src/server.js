/**
 * Server entry point.
 *
 * Responsibilities:
 *   - load + validate config (importing env.js will throw if a secret is missing)
 *   - verify the database is reachable BEFORE we start accepting traffic, so a
 *     misconfigured DB fails loudly at boot instead of on the first request
 *   - start the HTTP listener
 *   - shut the pool down cleanly on Ctrl-C / termination
 */

'use strict';

const app = require('./app');
const config = require('./config/env');
const { pool, ping } = require('./db/pool');

async function start() {
  // Fail fast if the DB isn't reachable.
  try {
    await ping();
    console.log(`[db] connected to ${config.db.host}:${config.db.port}/${config.db.database}`);
  } catch (err) {
    console.error('[db] FAILED to connect:', err.message);
    console.error('     Is MySQL running and are the DB_* vars in server/.env correct?');
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}  (env: ${config.env})`);
  });

  // Graceful shutdown: stop taking requests, then close DB connections.
  async function shutdown(signal) {
    console.log(`\n[api] ${signal} received, shutting down...`);
    server.close(async () => {
      await pool.end();
      console.log('[api] closed HTTP server and DB pool. Bye.');
      process.exit(0);
    });
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
