/**
 * store.js - Central data store for Favourite Books Online
 * Implements a simple in-memory store with localStorage persistence.
 * Coding Standard: Google JavaScript Style Guide
 * https://google.github.io/styleguide/jsguide.html
 */

'use strict';

const Store = (() => {

  // ── Seed Data ─────────────────────────────────────────────────────────────

  const SEED_BOOKS = [
    { isbn: '9780593311332', title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', publisher: 'Knopf', category: 'Literary Fiction', price: 32.99, stock: 18, cover: 'https://covers.openlibrary.org/b/isbn/9780593311332-L.jpg', description: 'A sweeping love story about creativity, identity and the nature of collaboration across three decades of game-making.' },
    { isbn: '9780385549134', title: 'Fourth Wing', author: 'Rebecca Yarros', publisher: 'Red Tower Books', category: 'Fantasy', price: 29.99, stock: 25, cover: 'https://covers.openlibrary.org/b/isbn/9780385549134-L.jpg', description: 'Enter the brutal and elite world of a war college for dragon riders where survival is never guaranteed.' },
    { isbn: '9781250301697', title: 'Lessons in Chemistry', author: 'Bonnie Garmus', publisher: 'Doubleday', category: 'Historical Fiction', price: 27.99, stock: 12, cover: 'https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg', description: 'A chemist turned cooking show host upends 1960s America in this delightfully funny debut.' },
    { isbn: '9780593230572', title: 'Demon Copperhead', author: 'Barbara Kingsolver', publisher: 'Harper', category: 'Literary Fiction', price: 34.99, stock: 9, cover: 'https://covers.openlibrary.org/b/isbn/9780593230572-L.jpg', description: 'A Pulitzer Prize–winning retelling of David Copperfield set in the opioid crisis of Appalachia.' },
    { isbn: '9780735224292', title: 'Little Fires Everywhere', author: 'Celeste Ng', publisher: 'Penguin', category: 'Drama', price: 24.99, stock: 14, cover: 'https://covers.openlibrary.org/b/isbn/9780735224292-L.jpg', description: 'In idyllic Shaker Heights, a clash between two families ignites questions of art, identity and motherhood.' },
    { isbn: '9781250301697', title: 'The Covenant of Water', author: 'Abraham Verghese', publisher: 'Grove Atlantic', category: 'Historical Fiction', price: 36.99, stock: 7, cover: 'https://covers.openlibrary.org/b/isbn/isbn/9780802162175-L.jpg', description: 'An epic saga spanning three generations of a family in South India, celebrating life amid loss.' },
    { isbn: '9780385547970', title: 'Intermezzo', author: 'Sally Rooney', publisher: 'Farrar Straus', category: 'Literary Fiction', price: 33.99, stock: 20, cover: 'https://covers.openlibrary.org/b/isbn/9780385547970-L.jpg', description: 'Two brothers navigate grief, love and connection in Sally Rooney\'s most emotionally ambitious novel.' },
    { isbn: '9780593243145', title: 'James', author: 'Percival Everett', publisher: 'Doubleday', category: 'Historical Fiction', price: 31.99, stock: 11, cover: 'https://covers.openlibrary.org/b/isbn/9780593243145-L.jpg', description: 'A stunning reimagining of Adventures of Huckleberry Finn told from the perspective of the enslaved Jim.' },
    { isbn: '9780008628482', title: 'The Women', author: 'Kristin Hannah', publisher: 'St. Martin\'s Press', category: 'Historical Fiction', price: 30.99, stock: 16, cover: 'https://covers.openlibrary.org/b/isbn/9780008628482-L.jpg', description: 'A powerful story of female Vietnam War nurses fighting to be seen, heard and remembered.' },
    { isbn: '9781668010969', title: 'All Fours', author: 'Miranda July', publisher: 'Scribner', category: 'Literary Fiction', price: 29.99, stock: 8, cover: 'https://covers.openlibrary.org/b/isbn/9781668010969-L.jpg', description: 'A woman\'s midlife detour from Los Angeles to New York spirals into obsession and transformation.' },
    { isbn: '9780593448946', title: 'The God of the Woods', author: 'Liz Moore', publisher: 'Riverhead', category: 'Mystery & Thriller', price: 32.99, stock: 13, cover: 'https://covers.openlibrary.org/b/isbn/9780593448946-L.jpg', description: 'When a girl goes missing from an Adirondack summer camp, long-buried family secrets begin to surface.' },
    { isbn: '9781250905062', title: 'Orbital', author: 'Samantha Harvey', publisher: 'Grove Press', category: 'Literary Fiction', price: 28.99, stock: 10, cover: 'https://covers.openlibrary.org/b/isbn/9781250905062-L.jpg', description: 'Six astronauts orbit Earth, watching sixteen sunrises in a single day—a Booker Prize-winning meditation on humanity.' },
  ];

  const SEED_ADMIN = {
    id: 'admin-001',
    name: 'Store Administrator',
    email: 'admin@favouritebooks.com.au',
    passwordHash: btoa('Admin@123'),
    role: 'administrator',
    accessLevel: 'full',
    createdAt: '2024-01-01T00:00:00.000Z'
  };

  // ── Initialisation ─────────────────────────────────────────────────────────

  function init() {
    if (!_get('fb_books')) {
      _set('fb_books', SEED_BOOKS.map((b, i) => ({ ...b, bookId: `BOOK-${String(i+1).padStart(3,'0')}`, available: true })));
    }
    if (!_get('fb_customers')) { _set('fb_customers', []); }
    if (!_get('fb_orders')) { _set('fb_orders', []); }
    if (!_get('fb_admin')) { _set('fb_admin', SEED_ADMIN); }
    if (!_get('fb_carts')) { _set('fb_carts', {}); }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
  function _genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }

  // ── Books ──────────────────────────────────────────────────────────────────

  function getBooks() { return _get('fb_books') || []; }

  function getBookById(bookId) {
    return getBooks().find(b => b.bookId === bookId) || null;
  }

  function searchBooks(query, category) {
    const q = (query || '').toLowerCase();
    return getBooks().filter(b => {
      const matchQuery = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q);
      const matchCat = !category || category === 'All' || b.category === category;
      return matchQuery && matchCat && b.available;
    });
  }

  function getCategories() {
    return ['All', ...new Set(getBooks().map(b => b.category))];
  }

  function updateBookStock(bookId, delta) {
    const books = getBooks();
    const idx = books.findIndex(b => b.bookId === bookId);
    if (idx === -1) return false;
    books[idx].stock = Math.max(0, books[idx].stock + delta);
    books[idx].available = books[idx].stock > 0;
    _set('fb_books', books);
    return true;
  }

  function addBook(bookData) {
    const books = getBooks();
    const book = { ...bookData, bookId: _genId('BOOK'), available: bookData.stock > 0 };
    books.push(book);
    _set('fb_books', books);
    return book;
  }

  function updateBook(bookId, updates) {
    const books = getBooks();
    const idx = books.findIndex(b => b.bookId === bookId);
    if (idx === -1) return null;
    books[idx] = { ...books[idx], ...updates, available: (updates.stock ?? books[idx].stock) > 0 };
    _set('fb_books', books);
    return books[idx];
  }

  // ── Customers ──────────────────────────────────────────────────────────────

  function getCustomers() { return _get('fb_customers') || []; }

  function getCustomerById(id) {
    return getCustomers().find(c => c.id === id) || null;
  }

  function getCustomerByEmail(email) {
    return getCustomers().find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
  }

  function createCustomer(name, email, password, address) {
    if (getCustomerByEmail(email)) return { error: 'Email already registered.' };
    const customer = {
      id: _genId('CUST'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: btoa(password),
      role: 'customer',
      address: address || '',
      createdAt: new Date().toISOString()
    };
    const customers = getCustomers();
    customers.push(customer);
    _set('fb_customers', customers);
    return { customer };
  }

  function updateCustomer(id, updates) {
    const customers = getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    customers[idx] = { ...customers[idx], ...updates };
    _set('fb_customers', customers);
    return customers[idx];
  }

  function authenticateCustomer(email, password) {
    const customer = getCustomerByEmail(email);
    if (!customer) return null;
    if (customer.passwordHash !== btoa(password)) return null;
    return customer;
  }

  function authenticateAdmin(email, password) {
    const admin = _get('fb_admin');
    if (!admin) return null;
    if (admin.email.toLowerCase() !== email.toLowerCase()) return null;
    if (admin.passwordHash !== btoa(password)) return null;
    return admin;
  }

  // ── Cart ───────────────────────────────────────────────────────────────────

  function getCart(customerId) {
    const carts = _get('fb_carts') || {};
    return carts[customerId] || [];
  }

  function addToCart(customerId, bookId, quantity) {
    const book = getBookById(bookId);
    if (!book || !book.available || book.stock < quantity) return { error: 'Book unavailable or insufficient stock.' };
    const carts = _get('fb_carts') || {};
    const cart = carts[customerId] || [];
    const existing = cart.findIndex(item => item.bookId === bookId);
    if (existing >= 0) {
      const newQty = cart[existing].quantity + quantity;
      if (newQty > book.stock) return { error: 'Not enough stock.' };
      cart[existing].quantity = newQty;
    } else {
      cart.push({ bookId, quantity, unitPrice: book.price, title: book.title, author: book.author, cover: book.cover });
    }
    carts[customerId] = cart;
    _set('fb_carts', carts);
    return { cart };
  }

  function updateCartItem(customerId, bookId, quantity) {
    const carts = _get('fb_carts') || {};
    const cart = carts[customerId] || [];
    if (quantity <= 0) {
      carts[customerId] = cart.filter(i => i.bookId !== bookId);
    } else {
      const idx = cart.findIndex(i => i.bookId === bookId);
      if (idx >= 0) cart[idx].quantity = quantity;
      carts[customerId] = cart;
    }
    _set('fb_carts', carts);
    return carts[customerId];
  }

  function clearCart(customerId) {
    const carts = _get('fb_carts') || {};
    carts[customerId] = [];
    _set('fb_carts', carts);
  }

  function cartTotal(customerId) {
    return getCart(customerId).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  function getOrders() { return _get('fb_orders') || []; }

  function getOrdersByCustomer(customerId) {
    return getOrders().filter(o => o.customerId === customerId);
  }

  function getOrderById(orderId) {
    return getOrders().find(o => o.orderId === orderId) || null;
  }

  function createOrder(customerId, deliveryAddress, deliveryMethod) {
    const cart = getCart(customerId);
    if (!cart.length) return { error: 'Cart is empty.' };
    const customer = getCustomerById(customerId);
    const items = cart.map(item => ({ ...item }));
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const shipping = deliveryMethod === 'express' ? 15.00 : 8.00;
    const gst = +(subtotal * 0.10).toFixed(2);
    const total = +(subtotal + shipping + gst).toFixed(2);

    const orderId = _genId('ORD');
    const invoiceId = _genId('INV');
    const paymentId = _genId('PAY');

    const order = {
      orderId,
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      items,
      deliveryAddress,
      deliveryMethod,
      subtotal: +subtotal.toFixed(2),
      shipping,
      gst,
      total,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      payment: null,
      invoice: null,
      shipment: null,
    };

    // Deduct stock
    items.forEach(item => updateBookStock(item.bookId, -item.quantity));

    const orders = getOrders();
    orders.push(order);
    _set('fb_orders', orders);
    clearCart(customerId);
    return { order };
  }

  function processPayment(orderId, paymentDetails) {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return { error: 'Order not found.' };

    const order = orders[idx];
    const paymentId = _genId('PAY');
    const invoiceId = _genId('INV');
    const shipmentId = _genId('SHIP');

    // Simulate payment processing
    const payment = {
      paymentId,
      orderId,
      method: paymentDetails.method,
      amount: order.total,
      status: 'Approved',
      referenceNumber: 'REF-' + Math.random().toString(36).toUpperCase().slice(2, 10),
      timestamp: new Date().toISOString()
    };

    const invoice = {
      invoiceId,
      orderId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items,
      subtotal: order.subtotal,
      gst: order.gst,
      shipping: order.shipping,
      total: order.total,
      paymentReference: payment.referenceNumber,
      generatedAt: new Date().toISOString()
    };

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + (order.deliveryMethod === 'express' ? 2 : 7));

    const shipment = {
      shipmentId,
      orderId,
      carrier: order.deliveryMethod === 'express' ? 'StarTrack Express' : 'Australia Post',
      trackingNumber: 'TRACK-' + Math.random().toString(36).toUpperCase().slice(2, 12),
      dispatchedAt: null,
      estimatedDelivery: estDate.toISOString().split('T')[0],
      status: 'Processing'
    };

    orders[idx] = { ...order, status: 'Paid', payment, invoice, shipment };
    _set('fb_orders', orders);
    return { order: orders[idx], payment, invoice, shipment };
  }

  function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return null;
    orders[idx].status = status;
    if (status === 'Shipped' && orders[idx].shipment) {
      orders[idx].shipment.status = 'Shipped';
      orders[idx].shipment.dispatchedAt = new Date().toISOString();
    }
    _set('fb_orders', orders);
    return orders[idx];
  }

  // ── Session ────────────────────────────────────────────────────────────────

  function getSession() { return _get('fb_session'); }
  function setSession(user) { _set('fb_session', user); }
  function clearSession() { localStorage.removeItem('fb_session'); }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    init,
    // Books
    getBooks, getBookById, searchBooks, getCategories, updateBookStock, addBook, updateBook,
    // Customers
    getCustomers, getCustomerById, getCustomerByEmail, createCustomer, updateCustomer,
    authenticateCustomer, authenticateAdmin,
    // Cart
    getCart, addToCart, updateCartItem, clearCart, cartTotal,
    // Orders
    getOrders, getOrdersByCustomer, getOrderById, createOrder, processPayment, updateOrderStatus,
    // Session
    getSession, setSession, clearSession,
  };

})();
