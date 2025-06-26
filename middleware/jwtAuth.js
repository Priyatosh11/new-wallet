const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'youraccesstokensecret';

const refreshTokenStore = new Set();
let blacklistedAccessTokens = [];

function jwtAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (blacklistedAccessTokens.includes(accessToken)) {
    return res.status(401).json({ error: 'Access token has been invalidated. Please login again.' });
  }

  if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Refresh token missing or invalid. Please login again.' });
  }

  jwt.verify(accessToken, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = user;
    next();
  });
}

module.exports = {
  jwtAuth,
  addBlacklistedAccessToken: (token) => { blacklistedAccessTokens.push(token); },
  isAccessTokenBlacklisted: (token) => blacklistedAccessTokens.includes(token),
  refreshTokenStore
};
