/**
 * views.js - All view renderers for Favourite Books Online
 * Coding Standard: Google JavaScript Style Guide
 * https://google.github.io/styleguide/jsguide.html
 */

'use strict';

const Views = {};

// ── Utility helpers ──────────────────────────────────────────────────────────

function formatCurrency(n) {
  return `A$${Number(n).toFixed(2)}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}

function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending', 'Paid': 'badge-paid', 'Processing': 'badge-processing',
    'Fulfilled': 'badge-fulfilled', 'Shipped': 'badge-shipped', 'Delivered': 'badge-delivered',
    'Approved': 'badge-paid', 'Cancelled': 'badge-cancelled'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
}

function bookCard(book, showAdmin = false) {
  return `
    <div class="book-card" data-book-id="${book.bookId}">
      <div class="book-card-cover">
        <img src="${book.cover}" alt="${book.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22><rect width=%22200%22 height=%22280%22 fill=%22%231a1a2e%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23e8c47a%22 text-anchor=%22middle%22 font-family=%22serif%22 font-size=%2240%22>📚</text></svg>'">
        <div class="book-card-overlay">
          <button class="btn-quick-view" data-book-id="${book.bookId}">View Details</button>
          ${!showAdmin ? `<button class="btn-add-cart" data-book-id="${book.bookId}">Add to Cart</button>` : ''}
        </div>
      </div>
      <div class="book-card-info">
        <span class="book-category">${book.category}</span>
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">${book.author}</p>
        <div class="book-footer">
          <span class="book-price">${formatCurrency(book.price)}</span>
          <span class="book-stock ${book.stock < 5 ? 'low-stock' : ''}">${book.stock > 0 ? (book.stock < 5 ? `Only ${book.stock} left` : 'In Stock') : 'Out of Stock'}</span>
        </div>
        ${showAdmin ? `<div class="admin-book-actions"><button class="btn-sm btn-edit" data-book-id="${book.bookId}">Edit</button><button class="btn-sm btn-stock" data-book-id="${book.bookId}">Stock: ${book.stock}</button></div>` : ''}
      </div>
    </div>
  `;
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────

Views.home = function(root) {
  const featured = Store.getBooks().slice(0, 4);
  root.innerHTML = `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-eyebrow">Glenferrie Road, Hawthorn — Now Online</div>
        <h1 class="hero-title">Favourite<br><em>Books</em></h1>
        <p class="hero-subtitle">Australia's most beloved independent bookstore, delivering stories across the country since 1987.</p>
        <div class="hero-actions">
          <button class="btn-primary hero-cta" onclick="App.navigate('catalogue')">Browse Catalogue</button>
          <button class="btn-ghost" onclick="App.navigate('register')">Join the Club</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-books-stack">
          ${featured.map((b,i) => `<div class="hero-book-item" style="--delay:${i * 0.15}s"><img src="${b.cover}" alt="${b.title}" onerror="this.style.display='none'"></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section-features">
      <div class="container">
        <div class="features-grid">
          <div class="feature-item">
            <span class="feature-icon">📦</span>
            <h4>Free Shipping</h4>
            <p>On all orders over $75 Australia-wide</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📖</span>
            <h4>Curated Selection</h4>
            <p>Hand-picked titles from our expert team</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔄</span>
            <h4>Easy Returns</h4>
            <p>30-day hassle-free return policy</p>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔒</span>
            <h4>Secure Checkout</h4>
            <p>Encrypted payments, always safe</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-featured">
      <div class="container">
        <div class="section-header">
          <h2>New Arrivals</h2>
          <button class="btn-text" onclick="App.navigate('catalogue')">View All →</button>
        </div>
        <div class="books-grid">
          ${featured.map(b => bookCard(b)).join('')}
        </div>
      </div>
    </section>

    <section class="section-categories">
      <div class="container">
        <h2>Browse by Category</h2>
        <div class="categories-grid">
          ${['Literary Fiction','Historical Fiction','Fantasy','Mystery & Thriller','Drama'].map(cat => `
            <button class="category-pill" onclick="App.navigate('catalogue',{category:'${cat}'})">
              <span>${cat}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  // Bind quick view and add to cart
  root.querySelectorAll('.btn-quick-view').forEach(btn => {
    btn.addEventListener('click', () => App.navigate('book', { bookId: btn.dataset.bookId }));
  });
  root.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', () => handleAddToCart(btn.dataset.bookId));
  });
};

// ── CATALOGUE VIEW ────────────────────────────────────────────────────────────

Views.catalogue = function(root, params = {}) {
  let query = params.query || '';
  let category = params.category || 'All';

  const render = () => {
    const books = Store.searchBooks(query, category);
    const categories = Store.getCategories();

    root.innerHTML = `
      <div class="catalogue-page">
        <div class="catalogue-header">
          <div class="container">
            <h1>Book Catalogue</h1>
            <p>${books.length} title${books.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        <div class="container catalogue-body">
          <aside class="catalogue-sidebar">
            <div class="search-box">
              <input type="text" id="search-input" placeholder="Search titles, authors…" value="${query}" class="input-field">
              <button class="btn-search" id="btn-search">🔍</button>
            </div>
            <div class="filter-section">
              <h4>Category</h4>
              ${categories.map(cat => `
                <label class="filter-option ${category === cat ? 'active' : ''}">
                  <input type="radio" name="category" value="${cat}" ${category === cat ? 'checked' : ''}> ${cat}
                </label>
              `).join('')}
            </div>
          </aside>
          <main class="catalogue-main">
            ${books.length ? `<div class="books-grid">${books.map(b => bookCard(b)).join('')}</div>` : `
              <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>No books found</h3>
                <p>Try a different search term or category.</p>
                <button class="btn-primary" onclick="App.navigate('catalogue')">Clear Filters</button>
              </div>
            `}
          </main>
        </div>
      </div>
    `;

    root.querySelector('#btn-search').addEventListener('click', () => {
      query = root.querySelector('#search-input').value;
      render();
    });
    root.querySelector('#search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { query = e.target.value; render(); }
    });
    root.querySelectorAll('[name="category"]').forEach(radio => {
      radio.addEventListener('change', () => { category = radio.value; render(); });
    });
    root.querySelectorAll('.btn-quick-view').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('book', { bookId: btn.dataset.bookId }));
    });
    root.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => handleAddToCart(btn.dataset.bookId));
    });
  };

  render();
};

// ── BOOK DETAIL VIEW ──────────────────────────────────────────────────────────

Views.book = function(root, params = {}) {
  const book = Store.getBookById(params.bookId);
  if (!book) { root.innerHTML = '<div class="error-view"><h2>Book not found</h2></div>'; return; }

  root.innerHTML = `
    <div class="book-detail-page container">
      <button class="btn-back" onclick="App.navigate('catalogue')">← Back to Catalogue</button>
      <div class="book-detail-grid">
        <div class="book-detail-cover">
          <img src="${book.cover}" alt="${book.title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22420%22><rect width=%22300%22 height=%22420%22 fill=%22%231a1a2e%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23e8c47a%22 text-anchor=%22middle%22 font-size=%2260%22>📚</text></svg>'">
        </div>
        <div class="book-detail-info">
          <span class="book-category">${book.category}</span>
          <h1>${book.title}</h1>
          <p class="book-detail-author">by <strong>${book.author}</strong></p>
          <p class="book-detail-publisher">Publisher: ${book.publisher} &nbsp;|&nbsp; ISBN: ${book.isbn}</p>
          <p class="book-detail-description">${book.description}</p>
          <div class="book-detail-purchase">
            <div class="book-detail-price">${formatCurrency(book.price)}</div>
            <div class="book-detail-stock ${book.stock < 5 ? 'low-stock' : ''}">
              ${book.stock > 0 ? (book.stock < 5 ? `⚠ Only ${book.stock} copies left` : `✓ In Stock (${book.stock} available)`) : '✕ Out of Stock'}
            </div>
            ${book.stock > 0 ? `
              <div class="qty-row">
                <label>Qty:</label>
                <div class="qty-control">
                  <button class="qty-btn" id="qty-dec">−</button>
                  <input type="number" id="qty-input" value="1" min="1" max="${book.stock}" class="qty-input">
                  <button class="qty-btn" id="qty-inc">+</button>
                </div>
              </div>
              <button class="btn-primary btn-add-cart-detail" data-book-id="${book.bookId}">Add to Cart</button>
            ` : `<button class="btn-primary" disabled>Out of Stock</button>`}
          </div>
        </div>
      </div>
    </div>
  `;

  if (book.stock > 0) {
    const qtyInput = root.querySelector('#qty-input');
    root.querySelector('#qty-dec').addEventListener('click', () => {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value) - 1);
    });
    root.querySelector('#qty-inc').addEventListener('click', () => {
      qtyInput.value = Math.min(book.stock, parseInt(qtyInput.value) + 1);
    });
    root.querySelector('.btn-add-cart-detail').addEventListener('click', () => {
      handleAddToCart(book.bookId, parseInt(qtyInput.value));
    });
  }
};

// ── CART VIEW ─────────────────────────────────────────────────────────────────

Views.cart = function(root) {
  const session = Store.getSession();
  if (!session) { App.navigate('login', { redirect: 'cart' }); return; }

  const renderCart = () => {
    const cart = Store.getCart(session.id);
    const total = Store.cartTotal(session.id);

    root.innerHTML = `
      <div class="cart-page container">
        <h1>Shopping Cart</h1>
        ${cart.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Discover our collection and add some books!</p>
            <button class="btn-primary" onclick="App.navigate('catalogue')">Browse Books</button>
          </div>
        ` : `
          <div class="cart-layout">
            <div class="cart-items">
              ${cart.map(item => `
                <div class="cart-item" data-book-id="${item.bookId}">
                  <img src="${item.cover}" alt="${item.title}" onerror="this.style.opacity='0'">
                  <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <p>${item.author}</p>
                    <span class="cart-item-price">${formatCurrency(item.unitPrice)} each</span>
                  </div>
                  <div class="cart-item-qty">
                    <button class="qty-btn" data-action="dec" data-book-id="${item.bookId}">−</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" data-action="inc" data-book-id="${item.bookId}">+</button>
                  </div>
                  <div class="cart-item-line">${formatCurrency(item.unitPrice * item.quantity)}</div>
                  <button class="btn-remove" data-book-id="${item.bookId}">✕</button>
                </div>
              `).join('')}
            </div>
            <div class="cart-summary">
              <h3>Order Summary</h3>
              <div class="summary-rows">
                <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(total)}</span></div>
                <div class="summary-row"><span>GST (10%)</span><span>${formatCurrency(total * 0.10)}</span></div>
                <div class="summary-row muted"><span>Shipping</span><span>Calculated at checkout</span></div>
                <div class="summary-divider"></div>
                <div class="summary-row total"><span>Estimated Total</span><span>${formatCurrency(total * 1.10)}</span></div>
              </div>
              <button class="btn-primary btn-checkout" onclick="App.navigate('checkout')">Proceed to Checkout</button>
              <button class="btn-ghost btn-continue" onclick="App.navigate('catalogue')">Continue Shopping</button>
            </div>
          </div>
        `}
      </div>
    `;

    // Qty and remove handlers
    root.querySelectorAll('.qty-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bookId = btn.dataset.bookId;
        const cart = Store.getCart(session.id);
        const item = cart.find(i => i.bookId === bookId);
        if (!item) return;
        const book = Store.getBookById(bookId);
        if (btn.dataset.action === 'inc' && item.quantity >= book.stock) {
          App.showToast('Not enough stock.', 'error'); return;
        }
        const newQty = btn.dataset.action === 'inc' ? item.quantity + 1 : item.quantity - 1;
        const result = await Store.updateCartItem(session.id, bookId, newQty);
        if (result.error) { App.showToast(result.error, 'error'); return; }
        App.updateNav();
        renderCart();
      });
    });
    root.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await Store.updateCartItem(session.id, btn.dataset.bookId, 0);
        if (result.error) { App.showToast(result.error, 'error'); return; }
        App.updateNav();
        App.showToast('Item removed from cart.', 'info');
        renderCart();
      });
    });
  };

  renderCart();
};

// ── CHECKOUT VIEW ─────────────────────────────────────────────────────────────

Views.checkout = function(root) {
  const session = Store.getSession();
  if (!session) { App.navigate('login', { redirect: 'checkout' }); return; }

  const cart = Store.getCart(session.id);
  if (!cart.length) { App.navigate('cart'); return; }

  const customer = Store.getCustomerById(session.id);
  const subtotal = Store.cartTotal(session.id);
  let deliveryMethod = 'standard';

  const updateSummary = () => {
    const shipping = deliveryMethod === 'express' ? 15.00 : 8.00;
    const gst = subtotal * 0.10;
    const total = subtotal + shipping + gst;
    root.querySelector('#sum-subtotal').textContent = formatCurrency(subtotal);
    root.querySelector('#sum-gst').textContent = formatCurrency(gst);
    root.querySelector('#sum-shipping').textContent = formatCurrency(shipping);
    root.querySelector('#sum-total').textContent = formatCurrency(total);
  };

  root.innerHTML = `
    <div class="checkout-page container">
      <h1>Checkout</h1>
      <div class="checkout-layout">
        <div class="checkout-form-section">

          <div class="checkout-block">
            <h3><span class="step-num">1</span> Delivery Details</h3>
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="del-name" class="input-field" value="${customer.name}" placeholder="Full name">
              <span class="field-error" id="err-del-name"></span>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="del-email" class="input-field" value="${customer.email}" placeholder="Email">
              <span class="field-error" id="err-del-email"></span>
            </div>
            <div class="form-group">
              <label>Delivery Address</label>
              <input type="text" id="del-address" class="input-field" value="${customer.address || ''}" placeholder="Street, Suburb, State, Postcode">
              <span class="field-error" id="err-del-address"></span>
            </div>
          </div>

          <div class="checkout-block">
            <h3><span class="step-num">2</span> Delivery Method</h3>
            <div class="delivery-options">
              <label class="delivery-option active" id="opt-standard">
                <input type="radio" name="delivery" value="standard" checked>
                <div class="delivery-option-content">
                  <span class="delivery-name">Standard Post</span>
                  <span class="delivery-desc">5–7 business days via Australia Post</span>
                  <span class="delivery-price">A$8.00</span>
                </div>
              </label>
              <label class="delivery-option" id="opt-express">
                <input type="radio" name="delivery" value="express">
                <div class="delivery-option-content">
                  <span class="delivery-name">Express Post</span>
                  <span class="delivery-desc">1–2 business days via StarTrack</span>
                  <span class="delivery-price">A$15.00</span>
                </div>
              </label>
            </div>
          </div>

          <button class="btn-primary btn-place-order" id="btn-place-order">Place Order</button>
        </div>

        <div class="checkout-summary">
          <h3>Your Order (${cart.length} item${cart.length !== 1 ? 's' : ''})</h3>
          <div class="checkout-items">
            ${cart.map(item => `
              <div class="checkout-item">
                <img src="${item.cover}" alt="${item.title}" onerror="this.style.opacity='0'">
                <div>
                  <p>${item.title}</p>
                  <span>Qty: ${item.quantity} × ${formatCurrency(item.unitPrice)}</span>
                </div>
                <span>${formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            `).join('')}
          </div>
          <div class="summary-rows">
            <div class="summary-row"><span>Subtotal</span><span id="sum-subtotal">${formatCurrency(subtotal)}</span></div>
            <div class="summary-row"><span>GST (10%)</span><span id="sum-gst">${formatCurrency(subtotal * 0.10)}</span></div>
            <div class="summary-row"><span>Shipping</span><span id="sum-shipping">${formatCurrency(8.00)}</span></div>
            <div class="summary-divider"></div>
            <div class="summary-row total"><span>Total</span><span id="sum-total">${formatCurrency(subtotal * 1.10 + 8.00)}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Delivery toggle
  root.querySelectorAll('[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', () => {
      deliveryMethod = radio.value;
      root.querySelectorAll('.delivery-option').forEach(o => o.classList.remove('active'));
      radio.closest('.delivery-option').classList.add('active');
      updateSummary();
    });
  });

  // Place order
  root.querySelector('#btn-place-order').addEventListener('click', async () => {
    const name = root.querySelector('#del-name').value.trim();
    const email = root.querySelector('#del-email').value.trim();
    const address = root.querySelector('#del-address').value.trim();
    const paymentMethod = 'simulated';

    let valid = true;

    const setError = (id, msg) => {
      const el = root.querySelector(`#${id}`);
      if (el) el.textContent = msg;
      if (msg) valid = false;
    };

    setError('err-del-name', !name ? 'Full name is required.' : '');
    setError('err-del-email', !email ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email address.' : '');
    setError('err-del-address', !address ? 'Delivery address is required.' : '');

    if (!valid) return;

    // Create order
    const orderResult = await Store.createOrder(session.id, address, deliveryMethod);
    if (orderResult.error) { App.showToast(orderResult.error, 'error'); return; }

    // Process payment
    const payResult = await Store.processPayment(orderResult.order.orderId, { method: paymentMethod });
    if (payResult.error) { App.showToast(payResult.error, 'error'); return; }

    App.updateNav();
    App.navigate('confirmation', { orderId: payResult.order.orderId });
  });
};

// ── CONFIRMATION VIEW ─────────────────────────────────────────────────────────

Views.confirmation = function(root, params = {}) {
  const order = Store.getOrderById(params.orderId);
  if (!order) { App.navigate('home'); return; }

  root.innerHTML = `
    <div class="confirmation-page container">
      <div class="confirmation-card">
        <div class="confirmation-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p class="confirmation-msg">Thank you, <strong>${order.customerName}</strong>. Your order has been placed and payment processed.</p>

        <div class="confirmation-details">
          <div class="conf-detail-row"><span>Order ID</span><strong>${order.orderId}</strong></div>
          <div class="conf-detail-row"><span>Payment Ref</span><strong>${order.payment.referenceNumber}</strong></div>
          <div class="conf-detail-row"><span>Date</span><strong>${formatDate(order.createdAt)}</strong></div>
          <div class="conf-detail-row"><span>Status</span>${statusBadge(order.status)}</div>
          <div class="conf-detail-row"><span>Delivery</span><strong>${order.deliveryMethod === 'express' ? 'Express Post' : 'Standard Post'}</strong></div>
          <div class="conf-detail-row"><span>Est. Delivery</span><strong>${formatDate(order.shipment.estimatedDelivery)}</strong></div>
          <div class="conf-detail-row"><span>Tracking</span><strong>${order.shipment.trackingNumber}</strong></div>
        </div>

        <div class="invoice-preview">
          <h3>Invoice #${order.invoice.invoiceId}</h3>
          <table class="invoice-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Line</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.title}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr><td colspan="3">Subtotal</td><td>${formatCurrency(order.subtotal)}</td></tr>
              <tr><td colspan="3">GST (10%)</td><td>${formatCurrency(order.gst)}</td></tr>
              <tr><td colspan="3">Shipping</td><td>${formatCurrency(order.shipping)}</td></tr>
              <tr class="invoice-total"><td colspan="3"><strong>Total Paid</strong></td><td><strong>${formatCurrency(order.total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>

        <div class="confirmation-actions">
          <button class="btn-primary" onclick="App.navigate('order-history')">View My Orders</button>
          <button class="btn-ghost" onclick="App.navigate('catalogue')">Continue Shopping</button>
        </div>
      </div>
    </div>
  `;
};

// ── LOGIN VIEW ────────────────────────────────────────────────────────────────

Views.login = function(root, params = {}) {
  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">📚</div>
        <h2>Welcome Back</h2>
        <p class="auth-subtitle">Sign in to your Favourite Books account</p>

        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="login-email" class="input-field" placeholder="you@example.com" autocomplete="email">
          <span class="field-error" id="err-login-email"></span>
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-group">
            <input type="password" id="login-pwd" class="input-field" placeholder="Your password" autocomplete="current-password">
            <button class="btn-toggle-pwd" id="toggle-pwd">👁</button>
          </div>
          <span class="field-error" id="err-login-pwd"></span>
        </div>
        <span class="field-error" id="err-login-general"></span>

        <button class="btn-primary btn-full" id="btn-login">Sign In</button>

        <div class="auth-hint">
          <p>Admin login: <code>admin@favouritebooks.com.au</code> / configured server password</p>
        </div>

        <p class="auth-switch">Don't have an account? <a href="#" id="go-register">Create one →</a></p>
      </div>
    </div>
  `;

  root.querySelector('#toggle-pwd').addEventListener('click', () => {
    const pwd = root.querySelector('#login-pwd');
    pwd.type = pwd.type === 'password' ? 'text' : 'password';
  });

  root.querySelector('#go-register').addEventListener('click', (e) => {
    e.preventDefault(); App.navigate('register', params);
  });

  const doLogin = async () => {
    const email = root.querySelector('#login-email').value.trim();
    const pwd = root.querySelector('#login-pwd').value;
    let valid = true;

    const setErr = (id, msg) => { root.querySelector(`#${id}`).textContent = msg; if (msg) valid = false; };

    setErr('err-login-email', !email ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email.' : '');
    setErr('err-login-pwd', !pwd ? 'Password is required.' : '');
    setErr('err-login-general', '');

    if (!valid) return;

    const result = await Store.login(email, pwd);
    const user = result.user;

    if (!user) { setErr('err-login-general', result.error || 'Incorrect email or password.'); return; }

    Store.setSession(user);
    await Store.loadBootstrap();
    App.updateNav();
    App.showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    App.navigate(params.redirect || (user.role === 'administrator' ? 'admin-dashboard' : 'home'));
  };

  root.querySelector('#btn-login').addEventListener('click', doLogin);
  root.querySelector('#login-pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
};

// ── REGISTER VIEW ─────────────────────────────────────────────────────────────

Views.register = function(root, params = {}) {
  root.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">📚</div>
        <h2>Join Favourite Books</h2>
        <p class="auth-subtitle">Create your account to start shopping</p>

        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="reg-name" class="input-field" placeholder="Jane Smith" autocomplete="name">
          <span class="field-error" id="err-reg-name"></span>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="reg-email" class="input-field" placeholder="you@example.com" autocomplete="email">
          <span class="field-error" id="err-reg-email"></span>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="reg-pwd" class="input-field" placeholder="At least 8 characters" autocomplete="new-password">
          <span class="field-error" id="err-reg-pwd"></span>
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="reg-pwd2" class="input-field" placeholder="Repeat password" autocomplete="new-password">
          <span class="field-error" id="err-reg-pwd2"></span>
        </div>
        <div class="form-group">
          <label>Delivery Address <span class="optional">(optional)</span></label>
          <input type="text" id="reg-addr" class="input-field" placeholder="Street, Suburb, State, Postcode">
        </div>
        <span class="field-error" id="err-reg-general"></span>

        <button class="btn-primary btn-full" id="btn-register">Create Account</button>
        <p class="auth-switch">Already have an account? <a href="#" id="go-login">Sign in →</a></p>
      </div>
    </div>
  `;

  root.querySelector('#go-login').addEventListener('click', (e) => {
    e.preventDefault(); App.navigate('login', params);
  });

  root.querySelector('#btn-register').addEventListener('click', async () => {
    const name = root.querySelector('#reg-name').value.trim();
    const email = root.querySelector('#reg-email').value.trim();
    const pwd = root.querySelector('#reg-pwd').value;
    const pwd2 = root.querySelector('#reg-pwd2').value;
    const addr = root.querySelector('#reg-addr').value.trim();
    let valid = true;

    const setErr = (id, msg) => { root.querySelector(`#${id}`).textContent = msg; if (msg) valid = false; };

    setErr('err-reg-name', !name ? 'Full name is required.' : name.length < 2 ? 'Name too short.' : '');
    setErr('err-reg-email', !email ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email.' : '');
    setErr('err-reg-pwd', !pwd ? 'Password is required.' : pwd.length < 8 ? 'Password must be at least 8 characters.' : '');
    setErr('err-reg-pwd2', pwd !== pwd2 ? 'Passwords do not match.' : '');
    setErr('err-reg-general', '');

    if (!valid) return;

    const result = await Store.createCustomer(name, email, pwd, addr);
    if (result.error) { setErr('err-reg-general', result.error); return; }

    Store.setSession(result.customer);
    await Store.loadBootstrap();
    App.updateNav();
    App.showToast(`Welcome to Favourite Books, ${name.split(' ')[0]}!`, 'success');
    App.navigate(params.redirect || 'home');
  });
};

// ── ACCOUNT VIEW ──────────────────────────────────────────────────────────────

Views.account = function(root) {
  const session = App.requireAuth('customer');
  if (!session) return;
  const customer = Store.getCustomerById(session.id);
  if (!customer) return;

  root.innerHTML = `
    <div class="account-page container">
      <h1>My Account</h1>
      <div class="account-grid">
        <div class="account-card">
          <h3>Personal Details</h3>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="acc-name" class="input-field" value="${customer.name}">
            <span class="field-error" id="err-acc-name"></span>
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="acc-email" class="input-field" value="${customer.email}">
            <span class="field-error" id="err-acc-email"></span>
          </div>
          <div class="form-group">
            <label>Delivery Address</label>
            <input type="text" id="acc-addr" class="input-field" value="${customer.address || ''}">
          </div>
          <span class="field-error" id="err-acc-general"></span>
          <button class="btn-primary" id="btn-save-account">Save Changes</button>
        </div>

        <div class="account-card">
          <h3>Quick Stats</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-num">${Store.getOrdersByCustomer(session.id).length}</span>
              <span class="stat-label">Total Orders</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">${formatCurrency(Store.getOrdersByCustomer(session.id).reduce((s,o) => s + o.total, 0))}</span>
              <span class="stat-label">Lifetime Spend</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">${Store.getCart(session.id).reduce((s,i) => s + i.quantity, 0)}</span>
              <span class="stat-label">Items in Cart</span>
            </div>
          </div>
          <button class="btn-secondary" onclick="App.navigate('order-history')">View Order History →</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#btn-save-account').addEventListener('click', async () => {
    const name = root.querySelector('#acc-name').value.trim();
    const email = root.querySelector('#acc-email').value.trim();
    const addr = root.querySelector('#acc-addr').value.trim();
    let valid = true;
    const setErr = (id, msg) => { root.querySelector(`#${id}`).textContent = msg; if (msg) valid = false; };
    setErr('err-acc-name', !name ? 'Name is required.' : '');
    setErr('err-acc-email', !email ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email.' : '');
    setErr('err-acc-general', '');
    if (!valid) return;
    const existing = Store.getCustomerByEmail(email);
    if (existing && existing.id !== session.id) { setErr('err-acc-general', 'Email already in use.'); return; }
    const result = await Store.updateCustomer(session.id, { name, email, address: addr });
    if (result.error) { setErr('err-acc-general', result.error); return; }
    Store.setSession({ ...session, ...result, token: session.token });
    App.updateNav();
    App.showToast('Account updated successfully.', 'success');
  });
};

// ── ORDER HISTORY VIEW ────────────────────────────────────────────────────────

Views.orderHistory = function(root) {
  const session = App.requireAuth('customer');
  if (!session) return;
  const orders = Store.getOrdersByCustomer(session.id).reverse();

  root.innerHTML = `
    <div class="orders-page container">
      <h1>Order History</h1>
      ${orders.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No orders yet</h3>
          <p>Your completed orders will appear here.</p>
          <button class="btn-primary" onclick="App.navigate('catalogue')">Start Shopping</button>
        </div>
      ` : `
        <div class="orders-list">
          ${orders.map(order => `
            <div class="order-card">
              <div class="order-card-header">
                <div>
                  <strong>${order.orderId}</strong>
                  <span class="order-date">${formatDate(order.createdAt)}</span>
                </div>
                <div class="order-card-meta">
                  ${statusBadge(order.status)}
                  <strong>${formatCurrency(order.total)}</strong>
                </div>
              </div>
              <div class="order-card-items">
                ${order.items.map(item => `<span class="order-item-chip">${item.title} ×${item.quantity}</span>`).join('')}
              </div>
              ${order.shipment ? `
                <div class="order-tracking">
                  <span>📦 ${order.shipment.carrier}</span>
                  <span>Tracking: <strong>${order.shipment.trackingNumber}</strong></span>
                  <span>Est. ${formatDate(order.shipment.estimatedDelivery)}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
};

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────

Views.adminDashboard = function(root) {
  const session = App.requireAuth('administrator');
  if (!session) return;

  const orders = Store.getOrders();
  const customers = Store.getCustomers();
  const books = Store.getBooks();
  const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s,o) => s + o.total, 0);
  const recentOrders = [...orders].reverse().slice(0, 5);

  root.innerHTML = `
    <div class="admin-page container">
      <div class="admin-header">
        <h1>Admin Dashboard</h1>
        <div class="admin-nav-tabs">
          <button class="tab active" onclick="App.navigate('admin-dashboard')">Dashboard</button>
          <button class="tab" onclick="App.navigate('admin-catalogue')">Catalogue</button>
          <button class="tab" onclick="App.navigate('admin-orders')">Orders</button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card"><span class="stat-num">${formatCurrency(revenue)}</span><span class="stat-label">Total Revenue</span></div>
        <div class="stat-card"><span class="stat-num">${orders.length}</span><span class="stat-label">Total Orders</span></div>
        <div class="stat-card"><span class="stat-num">${customers.length}</span><span class="stat-label">Registered Customers</span></div>
        <div class="stat-card"><span class="stat-num">${books.filter(b=>b.stock < 5).length}</span><span class="stat-label">Low Stock Items</span></div>
      </div>

      <div class="admin-grid">
        <div class="admin-card">
          <h3>Recent Orders</h3>
          <table class="admin-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${recentOrders.map(o => `
                <tr>
                  <td><code>${o.orderId.slice(0,12)}…</code></td>
                  <td>${o.customerName}</td>
                  <td>${formatCurrency(o.total)}</td>
                  <td>${statusBadge(o.status)}</td>
                  <td>
                    ${o.status === 'Paid' ? `<button class="btn-sm btn-action" data-order-id="${o.orderId}" data-status="Fulfilled">Fulfil</button>` : ''}
                    ${o.status === 'Fulfilled' ? `<button class="btn-sm btn-action" data-order-id="${o.orderId}" data-status="Shipped">Ship</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <button class="btn-text" onclick="App.navigate('admin-orders')">View all orders →</button>
        </div>

        <div class="admin-card">
          <h3>Low Stock Alert</h3>
          ${books.filter(b => b.stock < 5).map(b => `
            <div class="alert-row">
              <span>${b.title}</span>
              <span class="badge badge-pending">${b.stock} left</span>
            </div>
          `).join('') || '<p class="muted">All titles well-stocked.</p>'}
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-order-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await Store.updateOrderStatus(btn.dataset.orderId, btn.dataset.status);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast(`Order status updated to ${btn.dataset.status}.`, 'success');
      Views.adminDashboard(root);
    });
  });
};

// ── ADMIN CATALOGUE ───────────────────────────────────────────────────────────

Views.adminCatalogue = function(root) {
  const session = App.requireAuth('administrator');
  if (!session) return;

  let editingBook = null;

  const renderPage = () => {
    const books = Store.getBooks();
    root.innerHTML = `
      <div class="admin-page container">
        <div class="admin-header">
          <h1>Catalogue Management</h1>
          <div class="admin-nav-tabs">
            <button class="tab" onclick="App.navigate('admin-dashboard')">Dashboard</button>
            <button class="tab active">Catalogue</button>
            <button class="tab" onclick="App.navigate('admin-orders')">Orders</button>
          </div>
        </div>
        <button class="btn-primary" id="btn-add-book">+ Add New Book</button>
        <div id="book-form-container"></div>
        <div class="books-grid admin-books-grid">
          ${books.map(b => bookCard(b, true)).join('')}
        </div>
      </div>
    `;

    root.querySelector('#btn-add-book').addEventListener('click', () => showBookForm(null));

    root.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => showBookForm(Store.getBookById(btn.dataset.bookId)));
    });
    root.querySelectorAll('.btn-quick-view').forEach(btn => {
      btn.addEventListener('click', () => App.navigate('book', { bookId: btn.dataset.bookId }));
    });
  };

  const showBookForm = (book) => {
    editingBook = book;
    const fc = root.querySelector('#book-form-container');
    fc.innerHTML = `
      <div class="modal-overlay" id="book-modal">
        <div class="modal-card">
          <h3>${book ? 'Edit Book' : 'Add New Book'}</h3>
          <div class="form-row">
            <div class="form-group"><label>Title *</label><input id="bk-title" class="input-field" value="${book?.title||''}"><span class="field-error" id="err-bk-title"></span></div>
            <div class="form-group"><label>Author *</label><input id="bk-author" class="input-field" value="${book?.author||''}"><span class="field-error" id="err-bk-author"></span></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>ISBN *</label><input id="bk-isbn" class="input-field" value="${book?.isbn||''}"><span class="field-error" id="err-bk-isbn"></span></div>
            <div class="form-group"><label>Publisher</label><input id="bk-pub" class="input-field" value="${book?.publisher||''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Category</label>
              <select id="bk-cat" class="input-field">
                ${['Literary Fiction','Historical Fiction','Fantasy','Mystery & Thriller','Drama','Non-Fiction','Science Fiction','Biography'].map(c => `<option ${book?.category===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Price (A$) *</label><input id="bk-price" type="number" step="0.01" min="0" class="input-field" value="${book?.price||''}"><span class="field-error" id="err-bk-price"></span></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Stock *</label><input id="bk-stock" type="number" min="0" class="input-field" value="${book?.stock??''}"><span class="field-error" id="err-bk-stock"></span></div>
            <div class="form-group"><label>Cover URL</label><input id="bk-cover" class="input-field" value="${book?.cover||''}"></div>
          </div>
          <div class="form-group"><label>Description</label><textarea id="bk-desc" class="input-field" rows="3">${book?.description||''}</textarea></div>
          <div class="modal-actions">
            <button class="btn-primary" id="btn-save-book">${book ? 'Save Changes' : 'Add Book'}</button>
            <button class="btn-ghost" id="btn-cancel-book">Cancel</button>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-cancel-book').addEventListener('click', () => { fc.innerHTML = ''; });
    root.querySelector('#btn-save-book').addEventListener('click', async () => {
      const title = root.querySelector('#bk-title').value.trim();
      const author = root.querySelector('#bk-author').value.trim();
      const isbn = root.querySelector('#bk-isbn').value.trim();
      const price = parseFloat(root.querySelector('#bk-price').value);
      const stock = parseInt(root.querySelector('#bk-stock').value);
      let valid = true;
      const setErr = (id, msg) => { const el = root.querySelector(`#${id}`); if(el){ el.textContent = msg; if(msg) valid = false; } };
      setErr('err-bk-title', !title ? 'Title required.' : '');
      setErr('err-bk-author', !author ? 'Author required.' : '');
      setErr('err-bk-isbn', !isbn ? 'ISBN required.' : '');
      setErr('err-bk-price', isNaN(price) || price <= 0 ? 'Valid price required.' : '');
      setErr('err-bk-stock', isNaN(stock) || stock < 0 ? 'Valid stock required.' : '');
      if (!valid) return;
      const data = {
        title, author, isbn,
        publisher: root.querySelector('#bk-pub').value.trim(),
        category: root.querySelector('#bk-cat').value,
        price, stock,
        cover: root.querySelector('#bk-cover').value.trim() || '',
        description: root.querySelector('#bk-desc').value.trim(),
      };
      const result = book ? await Store.updateBook(book.bookId, data) : await Store.addBook(data);
      if (result.error) { App.showToast(result.error, 'error'); return; }
      App.showToast(book ? 'Book updated.' : 'Book added to catalogue.', 'success');
      fc.innerHTML = '';
      renderPage();
    });
  };

  renderPage();
};

// ── ADMIN ORDERS ──────────────────────────────────────────────────────────────

Views.adminOrders = function(root) {
  const session = App.requireAuth('administrator');
  if (!session) return;

  const renderPage = () => {
    const orders = [...Store.getOrders()].reverse();
    root.innerHTML = `
      <div class="admin-page container">
        <div class="admin-header">
          <h1>Order Management</h1>
          <div class="admin-nav-tabs">
            <button class="tab" onclick="App.navigate('admin-dashboard')">Dashboard</button>
            <button class="tab" onclick="App.navigate('admin-catalogue')">Catalogue</button>
            <button class="tab active">Orders</button>
          </div>
        </div>
        ${orders.length === 0 ? '<div class="empty-state"><h3>No orders yet.</h3></div>' : `
          <table class="admin-table full-table">
            <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Delivery</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><code>${o.orderId.slice(0,14)}…</code></td>
                  <td><div>${o.customerName}</div><small>${o.customerEmail}</small></td>
                  <td>${o.items.length} item${o.items.length!==1?'s':''}</td>
                  <td>${formatCurrency(o.total)}</td>
                  <td>${o.deliveryMethod === 'express' ? '⚡ Express' : '📮 Standard'}</td>
                  <td>${statusBadge(o.status)}</td>
                  <td>${formatDate(o.createdAt)}</td>
                  <td>
                    ${o.status === 'Paid' ? `<button class="btn-sm btn-action" data-order-id="${o.orderId}" data-status="Fulfilled">Fulfil</button>` : ''}
                    ${o.status === 'Fulfilled' ? `<button class="btn-sm btn-action" data-order-id="${o.orderId}" data-status="Shipped">Ship</button>` : ''}
                    ${o.status === 'Shipped' ? `<button class="btn-sm btn-action" data-order-id="${o.orderId}" data-status="Delivered">Deliver</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    root.querySelectorAll('[data-order-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await Store.updateOrderStatus(btn.dataset.orderId, btn.dataset.status);
        if (result.error) { App.showToast(result.error, 'error'); return; }
        App.showToast(`Order updated to ${btn.dataset.status}.`, 'success');
        renderPage();
      });
    });
  };

  renderPage();
};

// ── Shared handler ─────────────────────────────────────────────────────────────

async function handleAddToCart(bookId, qty = 1) {
  const session = Store.getSession();
  if (!session) { App.navigate('login', { redirect: 'cart' }); return; }
  if (session.role === 'administrator') { App.showToast('Admins cannot add to cart.', 'error'); return; }
  const result = await Store.addToCart(session.id, bookId, qty);
  if (result.error) { App.showToast(result.error, 'error'); return; }
  App.updateNav();
  App.showToast('Added to cart!', 'success');
}
