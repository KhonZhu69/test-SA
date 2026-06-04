/**
 * store.js - API-backed data store for Favourite Books Online
 * Keeps the existing view API while persisting data through the backend.
 */

'use strict';

const Store = (() => {

  const API_BASE = '/api';
  const state = {
    books: [],
    customers: [],
    orders: [],
    cart: [],
    customer: null,
  };

  async function init() {
    await loadBootstrap();
  }

  async function loadBootstrap() {
    let data;
    try {
      data = await request('/bootstrap');
    } catch (err) {
      if (err.status !== 401) throw err;
      clearSession();
      data = await request('/bootstrap');
    }
    state.books = data.books || [];
    state.customers = data.customers || [];
    state.orders = data.orders || [];
    state.cart = data.cart || [];
    state.customer = data.customer || null;
  }

  async function request(path, options = {}) {
    const session = getSession();
    const headers = { ...(options.headers || {}) };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      clearSession();
    }
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function upsertById(list, idKey, value) {
    const idx = list.findIndex(item => item[idKey] === value[idKey]);
    if (idx >= 0) list[idx] = value;
    else list.push(value);
  }

  function getBooks() { return state.books; }

  function getBookById(bookId) {
    return state.books.find(b => b.bookId === bookId) || null;
  }

  function searchBooks(query, category) {
    const q = (query || '').toLowerCase();
    return state.books.filter(b => {
      const matchQuery = !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.includes(q);
      const matchCat = !category || category === 'All' || b.category === category;
      return matchQuery && matchCat && b.available;
    });
  }

  function getCategories() {
    return ['All', ...new Set(state.books.map(b => b.category))];
  }

  async function updateBookStock(bookId, delta) {
    const book = getBookById(bookId);
    if (!book) return false;
    const result = await updateBook(bookId, {
      ...book,
      stock: Math.max(0, book.stock + delta),
    });
    return Boolean(result && !result.error);
  }

  async function addBook(bookData) {
    try {
      const data = await request('/books', {
        method: 'POST',
        body: JSON.stringify(bookData),
      });
      state.books.push(data.book);
      return data.book;
    } catch (err) {
      return { error: err.message };
    }
  }

  async function updateBook(bookId, updates) {
    try {
      const data = await request(`/books/${encodeURIComponent(bookId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      upsertById(state.books, 'bookId', data.book);
      return data.book;
    } catch (err) {
      return { error: err.message };
    }
  }

  function getCustomers() { return state.customers; }

  function getCustomerById(id) {
    if (state.customer?.id === id) return state.customer;
    return state.customers.find(c => c.id === id) || null;
  }

  function getCustomerByEmail(email) {
    const normalised = (email || '').toLowerCase();
    if (state.customer?.email?.toLowerCase() === normalised) return state.customer;
    return state.customers.find(c => c.email.toLowerCase() === normalised) || null;
  }

  async function createCustomer(name, email, password, address) {
    try {
      const data = await request('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, address }),
      });
      state.customer = data.customer;
      state.cart = [];
      return { customer: data.customer };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function updateCustomer(id, updates) {
    try {
      const data = await request(`/customers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      state.customer = data.customer;
      upsertById(state.customers, 'id', data.customer);

      const session = getSession();
      if (session?.id === data.customer.id) {
        setSession({ ...session, ...data.customer, token: session.token });
      }
      return data.customer;
    } catch (err) {
      return { error: err.message };
    }
  }

  async function login(email, password) {
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { user: data.user };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function authenticateCustomer(email, password) {
    const result = await login(email, password);
    return result.user?.role === 'customer' ? result.user : null;
  }

  async function authenticateAdmin(email, password) {
    const result = await login(email, password);
    return result.user?.role === 'administrator' ? result.user : null;
  }

  function getCart(customerId) {
    const session = getSession();
    return session?.id === customerId ? state.cart : [];
  }

  async function addToCart(customerId, bookId, quantity) {
    try {
      const data = await request(`/customers/${encodeURIComponent(customerId)}/cart`, {
        method: 'POST',
        body: JSON.stringify({ bookId, quantity }),
      });
      state.cart = data.cart;
      return { cart: data.cart };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function updateCartItem(customerId, bookId, quantity) {
    try {
      const data = await request(`/customers/${encodeURIComponent(customerId)}/cart/${encodeURIComponent(bookId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      state.cart = data.cart;
      return data.cart;
    } catch (err) {
      return { error: err.message };
    }
  }

  function clearCart(customerId) {
    const session = getSession();
    if (session?.id === customerId) state.cart = [];
  }

  function cartTotal(customerId) {
    return getCart(customerId).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  function getOrders() { return state.orders; }

  function getOrdersByCustomer(customerId) {
    return state.orders.filter(o => o.customerId === customerId);
  }

  function getOrderById(orderId) {
    return state.orders.find(o => o.orderId === orderId) || null;
  }

  async function createOrder(customerId, deliveryAddress, deliveryMethod) {
    const session = getSession();
    if (session?.id !== customerId) return { error: 'Authentication required.' };
    try {
      const data = await request('/orders', {
        method: 'POST',
        body: JSON.stringify({ deliveryAddress, deliveryMethod }),
      });
      upsertById(state.orders, 'orderId', data.order);
      state.cart = data.cart || [];
      state.books = data.books || state.books;
      return { order: data.order };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function processPayment(orderId, paymentDetails) {
    try {
      const data = await request(`/orders/${encodeURIComponent(orderId)}/payment`, {
        method: 'POST',
        body: JSON.stringify(paymentDetails),
      });
      upsertById(state.orders, 'orderId', data.order);
      return data;
    } catch (err) {
      return { error: err.message };
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const data = await request(`/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      upsertById(state.orders, 'orderId', data.order);
      return data.order;
    } catch (err) {
      return { error: err.message };
    }
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem('fb_session')); } catch { return null; }
  }

  function setSession(user) {
    localStorage.setItem('fb_session', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('fb_session');
    state.customers = [];
    state.orders = [];
    state.cart = [];
    state.customer = null;
  }

  return {
    init, loadBootstrap,
    getBooks, getBookById, searchBooks, getCategories, updateBookStock, addBook, updateBook,
    getCustomers, getCustomerById, getCustomerByEmail, createCustomer, updateCustomer,
    login, authenticateCustomer, authenticateAdmin,
    getCart, addToCart, updateCartItem, clearCart, cartTotal,
    getOrders, getOrdersByCustomer, getOrderById, createOrder, processPayment, updateOrderStatus,
    getSession, setSession, clearSession,
  };

})();
