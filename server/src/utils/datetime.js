/**
 * Datetime normalization for appointment times.
 *
 * The React form uses <input type="datetime-local">, which produces a value
 * like "2026-07-01T14:30" (no seconds, no timezone). MySQL DATETIME wants
 * "2026-07-01 14:30:00". We convert with simple STRING manipulation rather
 * than `new Date(...)` on purpose: parsing into a JS Date would apply timezone
 * math and could silently shift the stored time. The DATETIME column has no
 * timezone, so we keep the wall-clock value exactly as entered.
 */

'use strict';

/** Matches "YYYY-MM-DDTHH:MM", optionally with ":SS" and/or a trailing zone. */
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/;

function isValidDateTime(value) {
  return typeof value === 'string' && DATETIME_RE.test(value.trim());
}

function toMysqlDateTime(value) {
  let s = String(value).trim().replace('T', ' ');
  s = s.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, ''); // drop any timezone marker
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s)) s += ':00'; // add seconds if missing
  return s;
}

module.exports = { isValidDateTime, toMysqlDateTime };
