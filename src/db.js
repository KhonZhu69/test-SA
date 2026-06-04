'use strict';

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { seedBooks } = require('./seed-data');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Create a PostgreSQL database and set DATABASE_URL before starting the server.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function toBook(row) {
  if (!row) return null;
  return {
    bookId: row.book_id,
    isbn: row.isbn,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    category: row.category,
    price: Number(row.price),
    stock: Number(row.stock),
    cover: row.cover,
    description: row.description,
    available: row.available,
  };
}

function toUser(row, includeToken) {
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    address: row.address || '',
    accessLevel: row.access_level || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
  if (includeToken) user.token = includeToken;
  return user;
}

function toCartItem(row) {
  return {
    bookId: row.book_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    title: row.title,
    author: row.author,
    cover: row.cover,
  };
}

function toOrder(row, itemRows = []) {
  if (!row) return null;
  return {
    orderId: row.order_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    items: itemRows.map(toCartItem),
    deliveryAddress: row.delivery_address,
    deliveryMethod: row.delivery_method,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    gst: Number(row.gst),
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    payment: row.payment,
    invoice: row.invoice,
    shipment: row.shipment,
  };
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer', 'administrator')),
      address TEXT DEFAULT '',
      access_level TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS books (
      book_id TEXT PRIMARY KEY,
      isbn TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      cover TEXT DEFAULT '',
      description TEXT DEFAULT '',
      available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS carts (
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10,2) NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (customer_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES users(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_method TEXT NOT NULL CHECK (delivery_method IN ('standard', 'express')),
      subtotal NUMERIC(10,2) NOT NULL,
      shipping NUMERIC(10,2) NOT NULL,
      gst NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      payment JSONB,
      invoice JSONB,
      shipment JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(book_id),
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover TEXT DEFAULT '',
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(10,2) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);
  `);

  await seedAdmin();
  await seedCatalogue();
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@favouritebooks.com.au').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `
      INSERT INTO users (id, name, email, password_hash, role, access_level, created_at)
      VALUES ('admin-001', 'Store Administrator', $1, $2, 'administrator', 'full', '2024-01-01T00:00:00.000Z')
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          access_level = EXCLUDED.access_level
    `,
    [email, hash]
  );
}

async function seedCatalogue() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM books');
  if (rows[0].count > 0) return;

  for (const [index, book] of seedBooks.entries()) {
    const bookId = `BOOK-${String(index + 1).padStart(3, '0')}`;
    await pool.query(
      `
        INSERT INTO books
          (book_id, isbn, title, author, publisher, category, price, stock, cover, description, available)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        bookId,
        book.isbn,
        book.title,
        book.author,
        book.publisher,
        book.category,
        book.price,
        book.stock,
        book.cover,
        book.description,
        book.stock > 0,
      ]
    );
  }
}

module.exports = {
  pool,
  initDb,
  toBook,
  toUser,
  toCartItem,
  toOrder,
};
