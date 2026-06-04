'use strict';

require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { initDb, pool, toBook, toCartItem, toOrder, toUser } = require('./src/db');

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'local-dev-change-me';

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

function genId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function signUser(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

async function optionalAuth(req, _res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, jwtSecret);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    req.user = rows[0] ? toUser(rows[0]) : null;
    req.authFailed = !req.user;
  } catch {
    req.user = null;
    req.authFailed = true;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return sendError(res, 401, 'Authentication required.');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'administrator') {
    return sendError(res, 403, 'Administrator access required.');
  }
  next();
}

function requireSelfOrAdmin(req, res, next) {
  if (!req.user) return sendError(res, 401, 'Authentication required.');
  if (req.user.role === 'administrator' || req.user.id === req.params.customerId || req.user.id === req.params.id) {
    return next();
  }
  return sendError(res, 403, 'You can only access your own data.');
}

async function listBooks() {
  const { rows } = await pool.query('SELECT * FROM books ORDER BY book_id ASC');
  return rows.map(toBook);
}

async function listCustomers() {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE role = 'customer' ORDER BY created_at DESC"
  );
  return rows.map(toUser);
}

async function listCart(customerId, client = pool) {
  const { rows } = await client.query(
    `
      SELECT c.book_id, c.quantity, c.unit_price, b.title, b.author, b.cover
      FROM carts c
      JOIN books b ON b.book_id = c.book_id
      WHERE c.customer_id = $1
      ORDER BY c.updated_at DESC
    `,
    [customerId]
  );
  return rows.map(toCartItem);
}

async function loadOrder(orderId, client = pool) {
  const orderResult = await client.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
  if (!orderResult.rows[0]) return null;
  const itemsResult = await client.query(
    `
      SELECT book_id, quantity, unit_price, title, author, cover
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC
    `,
    [orderId]
  );
  return toOrder(orderResult.rows[0], itemsResult.rows);
}

async function listOrders(options = {}) {
  const params = [];
  const where = options.customerId ? 'WHERE customer_id = $1' : '';
  if (options.customerId) params.push(options.customerId);
  const { rows } = await pool.query(`SELECT order_id FROM orders ${where} ORDER BY created_at ASC`, params);
  const orders = [];
  for (const row of rows) {
    orders.push(await loadOrder(row.order_id));
  }
  return orders;
}

function bookInput(body) {
  return {
    title: String(body.title || '').trim(),
    author: String(body.author || '').trim(),
    isbn: String(body.isbn || '').trim(),
    publisher: String(body.publisher || '').trim(),
    category: String(body.category || 'General').trim(),
    price: Number(body.price),
    stock: Number.parseInt(body.stock, 10),
    cover: String(body.cover || '').trim(),
    description: String(body.description || '').trim(),
  };
}

function validateBookInput(data) {
  if (!data.title) return 'Title is required.';
  if (!data.author) return 'Author is required.';
  if (!data.isbn) return 'ISBN is required.';
  if (!Number.isFinite(data.price) || data.price <= 0) return 'A valid price is required.';
  if (!Number.isInteger(data.stock) || data.stock < 0) return 'A valid stock quantity is required.';
  return null;
}

app.use('/api', optionalAuth);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'favourite-books-api' });
});

app.get('/api/bootstrap', async (req, res, next) => {
  try {
    if (req.authFailed) return sendError(res, 401, 'Session expired. Please sign in again.');
    const payload = { books: await listBooks() };
    if (req.user?.role === 'administrator') {
      payload.customers = await listCustomers();
      payload.orders = await listOrders();
    }
    if (req.user?.role === 'customer') {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      payload.customer = toUser(rows[0]);
      payload.cart = await listCart(req.user.id);
      payload.orders = await listOrders({ customerId: req.user.id });
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return sendError(res, 400, 'Email and password are required.');

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const userRow = rows[0];
    if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) {
      return sendError(res, 401, 'Incorrect email or password.');
    }

    const token = signUser(userRow);
    res.json({ user: toUser(userRow, token) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/books', async (_req, res, next) => {
  try {
    res.json({ books: await listBooks() });
  } catch (err) {
    next(err);
  }
});

app.get('/api/books/:bookId', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM books WHERE book_id = $1', [req.params.bookId]);
    const book = toBook(rows[0]);
    if (!book) return sendError(res, 404, 'Book not found.');
    res.json({ book });
  } catch (err) {
    next(err);
  }
});

app.post('/api/books', requireAdmin, async (req, res, next) => {
  try {
    const data = bookInput(req.body);
    const error = validateBookInput(data);
    if (error) return sendError(res, 400, error);

    const bookId = genId('BOOK');
    const { rows } = await pool.query(
      `
        INSERT INTO books
          (book_id, isbn, title, author, publisher, category, price, stock, cover, description, available)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [bookId, data.isbn, data.title, data.author, data.publisher, data.category, data.price, data.stock, data.cover, data.description, data.stock > 0]
    );
    res.status(201).json({ book: toBook(rows[0]) });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/books/:bookId', requireAdmin, async (req, res, next) => {
  try {
    const data = bookInput(req.body);
    const error = validateBookInput(data);
    if (error) return sendError(res, 400, error);

    const { rows } = await pool.query(
      `
        UPDATE books
        SET isbn = $2,
            title = $3,
            author = $4,
            publisher = $5,
            category = $6,
            price = $7,
            stock = $8,
            cover = $9,
            description = $10,
            available = $11,
            updated_at = NOW()
        WHERE book_id = $1
        RETURNING *
      `,
      [req.params.bookId, data.isbn, data.title, data.author, data.publisher, data.category, data.price, data.stock, data.cover, data.description, data.stock > 0]
    );
    if (!rows[0]) return sendError(res, 404, 'Book not found.');
    res.json({ book: toBook(rows[0]) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/customers', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const address = String(req.body.address || '').trim();

    if (!name || !email || !password) return sendError(res, 400, 'Name, email and password are required.');
    if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters.');

    const hash = await bcrypt.hash(password, 10);
    const id = genId('CUST');
    const { rows } = await pool.query(
      `
        INSERT INTO users (id, name, email, password_hash, role, address)
        VALUES ($1, $2, $3, $4, 'customer', $5)
        RETURNING *
      `,
      [id, name, email, hash, address]
    );
    const token = signUser(rows[0]);
    res.status(201).json({ customer: toUser(rows[0], token) });
  } catch (err) {
    if (err.code === '23505') return sendError(res, 409, 'Email already registered.');
    next(err);
  }
});

app.get('/api/customers', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ customers: await listCustomers() });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/customers/:id', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const address = String(req.body.address || '').trim();
    if (!name || !email) return sendError(res, 400, 'Name and email are required.');

    const { rows } = await pool.query(
      `
        UPDATE users
        SET name = $2, email = $3, address = $4
        WHERE id = $1 AND role = 'customer'
        RETURNING *
      `,
      [req.params.id, name, email, address]
    );
    if (!rows[0]) return sendError(res, 404, 'Customer not found.');
    res.json({ customer: toUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return sendError(res, 409, 'Email already in use.');
    next(err);
  }
});

app.get('/api/customers/:customerId/cart', requireSelfOrAdmin, async (req, res, next) => {
  try {
    res.json({ cart: await listCart(req.params.customerId) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/customers/:customerId/cart', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const quantity = Number.parseInt(req.body.quantity, 10);
    const bookId = String(req.body.bookId || '');
    if (!bookId || !Number.isInteger(quantity) || quantity <= 0) {
      return sendError(res, 400, 'Book and quantity are required.');
    }

    const client = await pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      const bookResult = await client.query('SELECT * FROM books WHERE book_id = $1 FOR UPDATE', [bookId]);
      const book = toBook(bookResult.rows[0]);
      if (!book || !book.available || book.stock < quantity) {
        await client.query('ROLLBACK');
        return sendError(res, 400, 'Book unavailable or insufficient stock.');
      }

      const existing = await client.query(
        'SELECT quantity FROM carts WHERE customer_id = $1 AND book_id = $2',
        [req.params.customerId, bookId]
      );
      const newQuantity = (existing.rows[0]?.quantity || 0) + quantity;
      if (newQuantity > book.stock) {
        await client.query('ROLLBACK');
        return sendError(res, 400, 'Not enough stock.');
      }

      await client.query(
        `
          INSERT INTO carts (customer_id, book_id, quantity, unit_price, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (customer_id, book_id)
          DO UPDATE SET quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price, updated_at = NOW()
        `,
        [req.params.customerId, bookId, newQuantity, book.price]
      );
      await client.query('COMMIT');
      committed = true;
      res.json({ cart: await listCart(req.params.customerId) });
    } catch (err) {
      if (!committed) await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

app.patch('/api/customers/:customerId/cart/:bookId', requireSelfOrAdmin, async (req, res, next) => {
  try {
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!Number.isInteger(quantity)) return sendError(res, 400, 'Quantity is required.');

    if (quantity <= 0) {
      await pool.query(
        'DELETE FROM carts WHERE customer_id = $1 AND book_id = $2',
        [req.params.customerId, req.params.bookId]
      );
      return res.json({ cart: await listCart(req.params.customerId) });
    }

    const { rows } = await pool.query('SELECT stock FROM books WHERE book_id = $1', [req.params.bookId]);
    if (!rows[0]) return sendError(res, 404, 'Book not found.');
    if (quantity > rows[0].stock) return sendError(res, 400, 'Not enough stock.');

    await pool.query(
      `
        UPDATE carts
        SET quantity = $3, updated_at = NOW()
        WHERE customer_id = $1 AND book_id = $2
      `,
      [req.params.customerId, req.params.bookId, quantity]
    );
    res.json({ cart: await listCart(req.params.customerId) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders', requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user.role === 'administrator' ? req.query.customerId : req.user.id;
    res.json({ orders: await listOrders(customerId ? { customerId } : {}) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/orders/:orderId', requireAuth, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.orderId);
    if (!order) return sendError(res, 404, 'Order not found.');
    if (req.user.role !== 'administrator' && order.customerId !== req.user.id) {
      return sendError(res, 403, 'You can only access your own orders.');
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders', requireAuth, async (req, res, next) => {
  if (req.user.role !== 'customer') return sendError(res, 403, 'Only customers can place orders.');

  const deliveryAddress = String(req.body.deliveryAddress || '').trim();
  const deliveryMethod = String(req.body.deliveryMethod || 'standard');
  if (!deliveryAddress) return sendError(res, 400, 'Delivery address is required.');
  if (!['standard', 'express'].includes(deliveryMethod)) return sendError(res, 400, 'Invalid delivery method.');

  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');

    const customerResult = await client.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const customer = customerResult.rows[0];
    const cart = await listCart(req.user.id, client);
    if (!cart.length) {
      await client.query('ROLLBACK');
      return sendError(res, 400, 'Cart is empty.');
    }

    for (const item of cart) {
      const bookResult = await client.query('SELECT stock FROM books WHERE book_id = $1 FOR UPDATE', [item.bookId]);
      const book = bookResult.rows[0];
      if (!book || Number(book.stock) < item.quantity) {
        await client.query('ROLLBACK');
        return sendError(res, 400, `${item.title} does not have enough stock.`);
      }
    }

    const subtotal = Number(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2));
    const shipping = deliveryMethod === 'express' ? 15.00 : 8.00;
    const gst = Number((subtotal * 0.10).toFixed(2));
    const total = Number((subtotal + shipping + gst).toFixed(2));
    const orderId = genId('ORD');

    await client.query(
      `
        INSERT INTO orders
          (order_id, customer_id, customer_name, customer_email, delivery_address, delivery_method, subtotal, shipping, gst, total, status)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')
      `,
      [orderId, req.user.id, customer.name, customer.email, deliveryAddress, deliveryMethod, subtotal, shipping, gst, total]
    );

    for (const item of cart) {
      await client.query(
        `
          INSERT INTO order_items (order_id, book_id, title, author, cover, quantity, unit_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [orderId, item.bookId, item.title, item.author, item.cover, item.quantity, item.unitPrice]
      );
      await client.query(
        `
          UPDATE books
          SET stock = stock - $2,
              available = (stock - $2) > 0,
              updated_at = NOW()
          WHERE book_id = $1
        `,
        [item.bookId, item.quantity]
      );
    }

    await client.query('DELETE FROM carts WHERE customer_id = $1', [req.user.id]);
    await client.query('COMMIT');
    committed = true;

    res.status(201).json({
      order: await loadOrder(orderId),
      cart: [],
      books: await listBooks(),
    });
  } catch (err) {
    if (!committed) await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.post('/api/orders/:orderId/payment', requireAuth, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.orderId);
    if (!order) return sendError(res, 404, 'Order not found.');
    if (req.user.role !== 'administrator' && order.customerId !== req.user.id) {
      return sendError(res, 403, 'You can only pay for your own orders.');
    }

    const method = String(req.body.method || 'credit_card');
    const payment = {
      paymentId: genId('PAY'),
      orderId: order.orderId,
      method,
      amount: order.total,
      status: 'Approved',
      referenceNumber: `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };

    const invoice = {
      invoiceId: genId('INV'),
      orderId: order.orderId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items,
      subtotal: order.subtotal,
      gst: order.gst,
      shipping: order.shipping,
      total: order.total,
      paymentReference: payment.referenceNumber,
      generatedAt: new Date().toISOString(),
    };

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + (order.deliveryMethod === 'express' ? 2 : 7));
    const shipment = {
      shipmentId: genId('SHIP'),
      orderId: order.orderId,
      carrier: order.deliveryMethod === 'express' ? 'StarTrack Express' : 'Australia Post',
      trackingNumber: `TRACK-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      dispatchedAt: null,
      estimatedDelivery: estDate.toISOString().split('T')[0],
      status: 'Processing',
    };

    await pool.query(
      `
        UPDATE orders
        SET status = 'Paid', payment = $2, invoice = $3, shipment = $4
        WHERE order_id = $1
      `,
      [order.orderId, JSON.stringify(payment), JSON.stringify(invoice), JSON.stringify(shipment)]
    );

    res.json({
      order: await loadOrder(order.orderId),
      payment,
      invoice,
      shipment,
    });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/orders/:orderId/status', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!['Pending', 'Paid', 'Processing', 'Fulfilled', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return sendError(res, 400, 'Invalid order status.');
    }

    const order = await loadOrder(req.params.orderId);
    if (!order) return sendError(res, 404, 'Order not found.');
    const shipment = order.shipment ? { ...order.shipment } : null;
    if (status === 'Shipped' && shipment) {
      shipment.status = 'Shipped';
      shipment.dispatchedAt = new Date().toISOString();
    }

    await pool.query(
      `
        UPDATE orders
        SET status = $2, shipment = $3
        WHERE order_id = $1
      `,
      [req.params.orderId, status, shipment ? JSON.stringify(shipment) : null]
    );
    res.json({ order: await loadOrder(req.params.orderId) });
  } catch (err) {
    next(err);
  }
});

app.use('/api', (_req, res) => {
  sendError(res, 404, 'API route not found.');
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Favourite Books server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
