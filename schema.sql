-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  telegram_chat_id VARCHAR(255) UNIQUE,
  mobile VARCHAR(20) UNIQUE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('debit', 'credit')),
  amt NUMERIC(12, 2) NOT NULL,
  updated_bal NUMERIC(12, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  description TEXT
);
