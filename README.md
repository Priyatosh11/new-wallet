# New Wallet Backend Service

This is a backend service simulating a digital wallet system built with Node.js, Express, and PostgreSQL. It supports user registration, authentication, wallet funding, payments, transaction history, product catalog, and product purchases. Additionally, it integrates with a Telegram bot to send transaction alert messages to users.

---

## Features

- **User Registration** with password hashing and mobile number registration.
- **Basic Authentication** for protected endpoints.
- **Fund Account**: Deposit money into your wallet.
- **Pay Another User**: Transfer money to other registered users.
- **Check Balance**: View your wallet balance, optionally converted to other currencies.
- **Transaction History**: View your transaction statements.
- **Product Catalog**: Add and list products.
- **Buy Products**: Purchase products using wallet balance.
- **Telegram Bot Integration**: Receive transaction alert messages on Telegram.

---

## Telegram Bot Integration

- The Telegram bot username is: `@Ragnar113_bot`
- Registered users can link their Telegram account to their wallet by:
  1. Opening a chat with the bot in the Telegram app.
  2. Sending the command: `/start <your_mobile_number>`
- The backend verifies the mobile number and links the Telegram chat ID to the user.
- After linking, users receive real-time transaction alert messages on their Telegram app for:
  - Funds added to their wallet.
  - Payments sent or received.
- Each Telegram account can only be linked to one user.
- Multiple users can link their own Telegram accounts independently.

---

## Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL=postgres://<db_owner>:<db_password>@localhost:5432/<db_name>
JWT_SECRET=your_jwt_secret
PORT=4000
CURRENCY_API_KEY=<your_api_key>
TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
```

---

## Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Set up PostgreSQL database and run the provided `schema.sql` to create tables.
4. Create `.env` file with the above variables.
5. Start the server with `npm run dev` (requires nodemon) or `npm start`.

---

## API Endpoints and Testing

### 1. Register User

- **Endpoint:** `POST /register`
- **Body:**
  ```json
  {
    "username": "ashu",
    "password": "hunter2",
    "mobile": "7008437393"
  }
  ```
- **Response:** `201 Created` on success.

### 2. Fund Account

- **Endpoint:** `POST /fund`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Body:**
  ```json
  {
    "amt": 10000
  }
  ```
- **Response:**
  ```json
  {
    "balance": 10000
  }
  ```

### 3. Pay Another User

- **Endpoint:** `POST /pay`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Body:**
  ```json
  {
    "to": "priya",
    "amt": 100
  }
  ```
- **Response:**
  ```json
  {
    "balance": 9900
  }
  ```
- **Failure:** `400 Bad Request` if insufficient funds or recipient does not exist.

### 4. Check Balance (Optional Currency)

- **Endpoint:** `GET /bal?currency=USD`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Response:**
  ```json
  {
    "balance": 120.35,
    "currency": "USD"
  }
  ```

### 5. View Transaction History

- **Endpoint:** `GET /stmt`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Response:** List of transactions in reverse chronological order.

### 6. Add Product

- **Endpoint:** `POST /product`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Body:**
  ```json
  {
    "name": "Wireless Mouse",
    "price": 599,
    "description": "2.4 GHz wireless mouse with USB receiver"
  }
  ```
- **Response:** `201 Created` with product ID.

### 7. List All Products

- **Endpoint:** `GET /product`
- **Response:** List of all products.

### 8. Buy a Product

- **Endpoint:** `POST /buy`
- **Headers:** `Authorization: Basic <base64(username:password)>`
- **Body:**
  ```json
  {
    "product_id": 1
  }
  ```
- **Response:**
  ```json
  {
    "message": "Product purchased",
    "balance": 9301
  }
  ```
- **Failure:** `400 Bad Request` if insufficient balance or invalid product.

---

## Telegram Bot Usage

- Search for `@Ragnar113_bot` in your Telegram app.
- Start a chat and send `/start <your_mobile_number>` to link your Telegram account.
- Once linked, you will receive transaction alert messages for your wallet activities.

---

## Testing Instructions

- Use tools like Postman or Curl to test API endpoints.
- For protected endpoints, include Basic Auth header with base64 encoded `username:password`.
- Test user registration with mobile number.
- Link Telegram accounts by sending `/start <mobile_number>` from Telegram.
- Verify transaction notifications are received on Telegram for both sender and receiver if both have linked accounts.
- Test all endpoints for happy paths and error cases.

---

## Notes

- Ensure your PostgreSQL database is running and accessible.
- The Telegram bot must be running and polling to receive commands.
- Currency conversion uses https://currencyapi.com with the provided API key.

---

If you need help with any setup or testing, feel free to ask.
