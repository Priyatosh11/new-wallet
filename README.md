# New Wallet API

## Overview

This API provides user registration, authentication, and wallet transaction functionalities. It uses JWT (JSON Web Tokens) for secure authentication with access tokens and refresh tokens to maintain user sessions securely.

---

## API Endpoints

### 1. User Registration

- **URL:** `/user/register`
- **Method:** POST
- **Description:** Registers a new user with username, password, and mobile number.
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string",
    "mobile": "string"
  }
  ```
- **Response:**
  - 201 Created on success
  - 400 Bad Request if username or mobile already exists or missing fields

---

### 2. User Login

- **URL:** `/user/login`
- **Method:** POST
- **Description:** Authenticates user credentials and issues JWT access and refresh tokens.
- **Request Body:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response:**
  - JSON containing `accessToken` (JWT access token)
  - Sets HTTP-only cookie `refreshToken` for session management

---

### 3. Refresh Access Token

- **URL:** `/user/refresh-token`
- **Method:** POST
- **Description:** Uses the refresh token cookie to issue a new access token without requiring login.
- **Request:** Must include the HTTP-only `refreshToken` cookie.
- **Response:**
  - JSON containing new `accessToken`

---

### 4. Logout

- **URL:** `/user/logout`
- **Method:** POST
- **Description:** Logs out the user by invalidating the access token and removing the refresh token cookie.
- **Request:** Must include `Authorization` header with access token and `refreshToken` cookie.
- **Response:**
  - Confirmation message on successful logout

---

### 5. Protected Wallet Endpoints

All the following endpoints require a valid JWT access token in the `Authorization` header (`Bearer <token>`):

- **Fund Account:** `/user/fund` (POST) - Add funds to user wallet.
- **Request Body:**
```json
   { "amt": 100 }
```
- **Pay Another User:** `/user/pay` (POST) - Transfer funds to another user.
- **Request Body;**
```json
 {"to": "recipientUsername", "amt": 50 }
```
- **Check Balance:** `/user/bal?currency=USD`(optional) (GET) - Get current balance, optionally converted to another currency.
- **View Transaction History:** `/user/stmt` (GET) - Get transaction statements.
- **Delete User Account:** `/user/user` (DELETE) - Delete user and related transactions.

---

### 6. Product Endpoints

These endpoints handle product-related operations:

- **Add Product:** `/product/product` (POST)
  - Adds a new product.
  - Requires a valid JWT access token in the `Authorization` header.
  - Request body should include `name`, `price`, and optional `description`.
  - **Request Body:**
  ```json
  { "name": "productName", "price": 100, "description": "productDescription" }
  ```
- **Get All Products:** `/product/product` (GET)
  - Retrieves a list of all products.
- **Buy Product:** `/product/buy` (POST)
  - Allows a user to purchase a product.
  - Requires a valid JWT access token in the `Authorization` header.
  - **Request Body:**
  ```json
     { "product_id": 1 }
  ```

---

## JWT and Refresh Token Implementation

- **Access Token:**
  - Short-lived JWT (default 1 hour expiry).
  - Contains user ID and username.
  - Signed with `ACCESS_TOKEN_SECRET` from environment variables.
  - Sent in response body on login and refresh.
  - Used in `Authorization` header for protected API requests.

- **Refresh Token:**
  - Long-lived JWT (default 7 days expiry).
  - Contains user ID and username.
  - Signed with `REFRESH_TOKEN_SECRET` from environment variables.
  - Stored securely as an HTTP-only cookie (`refreshToken`).
  - Used to obtain new access tokens without re-login.
  - Stored server-side in a Set (`refreshTokenStore`) to track valid tokens.
  - Removed from store on logout to invalidate.

- **Security Measures:**
  - Refresh token stored in HTTP-only cookie to prevent JavaScript access and XSS attacks.
  - `sameSite: 'strict'` cookie attribute to mitigate CSRF attacks.
  - Access tokens are blacklisted on logout to prevent reuse.
  - Secrets are stored in environment variables and never exposed to clients.

---

## Environment Variables

- `ACCESS_TOKEN_SECRET` - Secret key for signing access tokens.
- `REFRESH_TOKEN_SECRET` - Secret key for signing refresh tokens.
- `ACCESS_TOKEN_EXPIRY` - Access token expiry duration (e.g., `1h`).
- `REFRESH_TOKEN_EXPIRY` - Refresh token expiry duration (e.g., `7d`).
- `CURRENCY_API_KEY` - API key for currency conversion service.
- `TELEGRAM_BOT_TOKEN` - Token for Telegram bot integration.
- `NODE_ENV` - Set to `production` in production environment to enable secure cookies.

---

## How to Use

1. Register a new user via `/user/register`.
2. Login via `/user/login` to receive access token and refresh token cookie.
3. Use the access token in `Authorization` header to access protected endpoints.
4. When access token expires, call `/user/refresh-token` to get a new access token using the refresh token cookie.
5. Logout via `/user/logout` to invalidate tokens.

---

This setup ensures secure, stateless authentication with token expiration and revocation, protecting user sessions effectively.
