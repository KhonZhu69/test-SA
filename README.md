# Favourite Books Online

Static bookstore frontend now served by an Express backend with PostgreSQL persistence.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database and copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` so `DATABASE_URL` points at your database.

4. Start the app:

   ```bash
   npm run dev
   ```

The server initialises the schema and seeds the admin account/catalogue automatically.

Default admin login:

- Email: `admin@favouritebooks.com.au`
- Password: set by `ADMIN_PASSWORD` in `.env`

## Render Deployment

This repo includes `render.yaml` for a Render Blueprint. It creates:

- one Node web service
- one Render PostgreSQL database
- a generated `JWT_SECRET`
- `DATABASE_URL` wired from the database connection string

Set `ADMIN_PASSWORD` in the Render dashboard when prompted, then deploy.
