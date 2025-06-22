require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

// Basic route to check server status
app.get('/', (req, res) => {
  res.json({ message: 'Digital Wallet API is running' });
});

const { router: userRoutes } = require('./routes/user');
const productRoutes = require('./routes/product');

app.use('/', userRoutes);
app.use('/', productRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, pool };
