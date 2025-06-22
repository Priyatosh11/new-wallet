const basicAuth = require('basic-auth');
const bcrypt = require('bcrypt');
const pool = require('../db');

async function authenticate(req, res, next) {
  const credentials = basicAuth(req);
  if (!credentials || !credentials.name || !credentials.pass) {
    res.set('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [credentials.name]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(credentials.pass, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.user = { id: user.id, username: user.username };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = authenticate;
