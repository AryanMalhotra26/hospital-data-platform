/**
 * MySQL connection pool (mysql2, promise API).
 *
 * Why a POOL instead of a single connection?
 *   - A web server handles many requests concurrently. One shared connection
 *     would serialize every query (and break on disconnect). A pool keeps a
 *     set of reusable connections and hands a free one to each query, then
 *     returns it — far better throughput and resilience.
 *   - `pool.query()` automatically acquires + releases a connection for us.
 *
 * We export the promise-based pool so callers can `await pool.query(...)`.
 */

'use strict';

const mysql = require('mysql2/promise');
const config = require('../config/env');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,

  // Pool tuning:
  waitForConnections: true, // queue queries when all connections are busy
  connectionLimit: 10, // max simultaneous connections
  queueLimit: 0, // unlimited queue (0 = no cap)

  // Safety/consistency:
  namedPlaceholders: false, // we use positional `?` placeholders everywhere
  dateStrings: true, // return DATE/DATETIME as strings, not JS Date objects,
  // so timezone conversions don't silently shift values
});

/**
 * Quick connectivity check used by the /api/health endpoint and at startup.
 * Returns true if the DB answers a trivial query.
 */
async function ping() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

module.exports = { pool, ping };
