const { STATUS_CODES } = require('http');

/**
 * JSON 404 for unmatched routes (replaces Express's default HTML page).
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function resolveStatus(err) {
  const status = Number(err && (err.status || err.statusCode));
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

/**
 * Final error handler (DEF-028, CWE-209).
 *
 * Express's default handler renders HTML with the stack trace and absolute paths
 * whenever NODE_ENV !== 'production' — including when NODE_ENV is unset, which is
 * how CI and `npm start` run. Always answer with a generic JSON message instead;
 * details of 5xx errors go to the server log only.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = resolveStatus(err);
  let error;
  if (status >= 500) {
    error = 'Internal server error';
    if (process.env.NODE_ENV !== 'test') process.stderr.write(`${(err && err.stack) || err}\n`);
  } else if (err && err.type === 'entity.parse.failed') {
    error = 'Invalid JSON body';
  } else {
    error = STATUS_CODES[status] || 'Request error';
  }

  res.status(status).json({ error });
}

module.exports = { errorHandler, notFoundHandler };
