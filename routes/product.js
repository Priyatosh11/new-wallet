const express = require('express');
const { jwtAuth } = require('../middleware/jwtAuth');
const pool = require('../db');
const { recordTransaction } = require('./user');

const router = express.Router();

router.post('/product', jwtAuth, async (req, res) => {
  const { name, price, description } = req.body;
  if (!name || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Name and positive price are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING id',
      [name, price, description || '']
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Product added' });
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/product', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, price, description FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/buy', jwtAuth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  try {
    const productRes = await pool.query('SELECT price FROM products WHERE id = $1', [product_id]);
    if (productRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid product' });
    }
    const price = parseFloat(productRes.rows[0].price);

    const userRes = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    const balance = parseFloat(userRes.rows[0].balance);

    if (balance < price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = balance - price;

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.user.id]);
    await pool.query(
      'INSERT INTO transactions (user_id, kind, amt, updated_bal) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'debit', price, newBalance]
    );
    await pool.query('COMMIT');

    // Send Telegram notification for purchase
    await recordTransaction(req.user.id, 'debit', price, newBalance);

    // Return updated balance after purchase
    res.json({ message: 'Product purchased', balance: newBalance });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Buy product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
