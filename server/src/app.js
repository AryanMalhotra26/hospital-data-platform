/**
 * Express application assembly.
 *
 * Middleware ORDER matters — Express runs them top to bottom:
 *   1. helmet      -> sensible security headers
 *   2. cors        -> allow the React dev server (only) to call us
 *   3. express.json-> parse JSON request bodies into req.body
 *   4. morgan      -> request logging (dev visibility)
 *   5. /api routes -> the actual application
 *   6. notFound    -> 404 for anything unmatched
 *   7. errorHandler-> last; formats every error into JSON
 *
 * Keeping this file free of business logic makes it easy to see the whole
 * request pipeline at a glance.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());

// Only the configured client origin may call the API from a browser. The JWT
// travels in an Authorization header (not a cookie), so we don't need
// credentialed CORS here.
app.use(cors({ origin: config.clientOrigin }));

app.use(express.json());

// Concise colored request logs in development.
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', apiRoutes);

// 404 + centralized error handling come LAST.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
