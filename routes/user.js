
const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const { jwtAuth, refreshTokenStore } = require('../middleware/jwtAuth');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const TelegramBot = require('node-telegram-bot-api');

const router = express.Router();

const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY;
const CURRENCY_API_URL = 'https://api.currencyapi.com/v3/latest';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'youraccesstokensecret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'yourrefreshtokensecret';

const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // refresh token expiry
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h'; // access token expiry

/* Removed local refreshTokens variable to ensure shared state is used dynamically */

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
let telegramBot;

if (telegramBotToken) {
  telegramBot = new TelegramBot(telegramBotToken, { polling: true }); //polling true means it will continuously check for new messages

  telegramBot.onText(/\/start (\d{10})/, async (msg, match) => {
    const chatId = msg.chat.id;
    const mobile = match[1];

    try {
      // Check if telegram_chat_id is already linked to another user
      const existing = await pool.query('SELECT id FROM users WHERE telegram_chat_id = $1', [chatId]);
      if (existing.rowCount > 0) {
        telegramBot.sendMessage(chatId, 'This Telegram account is already linked to another user.');
        return;
      }
      // Link telegram_chat_id to user by mobile number
      const res = await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE mobile = $2 RETURNING id', [chatId, mobile]);
      if (res.rowCount > 0) {
        telegramBot.sendMessage(chatId, 'Your Telegram account has been linked successfully!');
      } else {
        telegramBot.sendMessage(chatId, 'No user found with this mobile number. Please register first.');
      }
    } catch (err) {
      console.error('Telegram linking error:', err);
      telegramBot.sendMessage(chatId, `An error occurred while linking your account: ${err.message}`);
    }
  });
}

// Helper to send Telegram message if chat ID exists
async function sendTelegramMessage(userId, message) {
  try {
    if (!telegramBot) {
      console.warn('Telegram bot not initialized, skipping message send.');
      return;
    }
    const res = await pool.query('SELECT telegram_chat_id FROM users WHERE id = $1', [userId]);
    if (res.rows.length > 0 && res.rows[0].telegram_chat_id) {
      telegramBot.sendMessage(res.rows[0].telegram_chat_id, message);
    }
  } catch (err) {
    console.error('Telegram message error:', err);
  }
}

async function recordTransaction(userId, kind, amt, updated_bal) {
  await pool.query(
    'INSERT INTO transactions (user_id, kind, amt, updated_bal) VALUES ($1, $2, $3, $4)',
    [userId, kind, amt, updated_bal]
  );
  // Send Telegram notification
  const message = `Transaction Alert: Your account was ${kind}ed by ₹${amt}. New balance: ₹${updated_bal}.`;
  await sendTelegramMessage(userId, message);
}

module.exports = {
  router,
  recordTransaction
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userPayload = { id: user.id, username: user.username };
    const accessToken = jwt.sign(userPayload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(userPayload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
refreshTokenStore.add(refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh-token', (req, res) => {
const refreshToken = req.cookies.refreshToken;
if (!refreshToken) {
  return res.status(401).json({ error: 'Refresh token required' });
}
if (!refreshTokenStore.has(refreshToken)) {
  return res.status(403).json({ error: 'Invalid refresh token' });
}
  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    const userPayload = { id: user.id, username: user.username };
    const accessToken = jwt.sign(userPayload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    res.json({ accessToken });
  });
});

const { addBlacklistedAccessToken } = require('../middleware/jwtAuth');

router.post('/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

refreshTokenStore.delete(refreshToken);

  if (accessToken) {
    addBlacklistedAccessToken(accessToken);
  }

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out successfully' });
});

async function recordTransaction(userId, kind, amt, updated_bal) {
  await pool.query(
    'INSERT INTO transactions (user_id, kind, amt, updated_bal) VALUES ($1, $2, $3, $4)',
    [userId, kind, amt, updated_bal]
  );
  // Send Telegram notification
  const message = `Transaction Alert: Your account was ${kind}ed by ₹${amt}. New balance: ₹${updated_bal}.`;
  await sendTelegramMessage(userId, message);
}

module.exports.recordTransaction = recordTransaction;

router.post('/register', async (req, res) => {
  const { username, password, mobile } = req.body;
  if (!username || !password || !mobile) {
    return res.status(400).json({ error: 'Username, password and mobile number are required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, mobile) VALUES ($1, $2, $3)',
      [username, hashed, mobile]
    );
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Username or mobile number already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Fund Account
router.post('/fund', jwtAuth, async (req, res) => {
  const { amt } = req.body;
  if (typeof amt !== 'number' || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  try {
    const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    const currentBalance = parseFloat(userRes.rows[0].balance);
    const newBalance = currentBalance + amt;
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.user.id]);
    await recordTransaction(req.user.id, 'credit', amt, newBalance);
    res.json({ balance: newBalance });
  } catch (err) {
    console.error('Fund error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Pay Another User
router.post('/pay', jwtAuth, async (req, res) => {
  const { to, amt } = req.body;
  if (!to || typeof amt !== 'number' || amt <= 0) {
    return res.status(400).json({ error: 'Recipient and positive amount required' });
  }
  try {
    if (to === req.user.username) {
      return res.status(400).json({ error: 'Cannot pay yourself' });
    }
    const senderRes = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    const senderBalance = parseFloat(senderRes.rows[0].balance);
    if (senderBalance < amt) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    const recipientRes = await pool.query('SELECT id, balance FROM users WHERE username = $1', [to]);
    if (recipientRes.rows.length === 0) {
      return res.status(400).json({ error: 'Recipient does not exist' });
    }
    const recipient = recipientRes.rows[0];
    const newSenderBalance = senderBalance - amt;
    const newRecipientBalance = parseFloat(recipient.balance) + amt;

    // Use transaction to ensure atomicity
    await pool.query('BEGIN');
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newSenderBalance, req.user.id]);
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newRecipientBalance, recipient.id]);
    await recordTransaction(req.user.id, 'debit', amt, newSenderBalance);
    await recordTransaction(recipient.id, 'credit', amt, newRecipientBalance);
    await pool.query('COMMIT');

    res.json({ balance: newSenderBalance });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Pay error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Check Balance (with optional currency)
router.get('/bal', jwtAuth, async (req, res) => {
  const currency = req.query.currency;
  try {
    const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    let balance = parseFloat(userRes.rows[0].balance);
    if (currency && currency !== 'INR') {
      // Fetch conversion rate from currencyapi.com
      const response = await axios.get(CURRENCY_API_URL, {
        params: {
          apikey: CURRENCY_API_KEY,
          base_currency: 'INR',
          currencies: currency
        }
      });
      const rate = response.data.data[currency]?.value;
      if (!rate) {
        return res.status(400).json({ error: 'Invalid currency code' });
      }
      balance = balance * rate;
      return res.json({ balance: parseFloat(balance.toFixed(2)), currency });
    }
    res.json({ balance, currency: 'INR' });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. View Transaction History
router.get('/stmt', jwtAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT kind, amt, updated_bal, timestamp FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Statement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  
// 9. Delete User Account
router.delete('/user', jwtAuth, async (req, res) => {
  try {
    // Delete transactions first due to foreign key constraints
    await pool.query('BEGIN');
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [req.user.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    await pool.query('COMMIT');
    res.json({ message: 'User account and related transactions deleted successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  router,
  recordTransaction
};
