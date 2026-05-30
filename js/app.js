/**
 * app.js - Main application controller / router
 * Coding Standard: Google JavaScript Style Guide
 * https://google.github.io/styleguide/jsguide.html
 */

'use strict';

const App = (() => {

  let currentView = null;
  const $root = () => document.getElementById('app-root');

  // ── Router ─────────────────────────────────────────────────────────────────

  function navigate(view, params = {}) {
    window.history.pushState({ view, params }, '', `#${view}`);
    render(view, params);
  }

  function render(view, params = {}) {
    currentView = view;
    updateNav();
    const root = $root();
    root.innerHTML = '';
    root.className = `view-${view}`;

    const views = {
      home: Views.home,
      catalogue: Views.catalogue,
      book: Views.book,
      cart: Views.cart,
      checkout: Views.checkout,
      confirmation: Views.confirmation,
      login: Views.login,
      register: Views.register,
      account: Views.account,
      'order-history': Views.orderHistory,
      'admin-dashboard': Views.adminDashboard,
      'admin-catalogue': Views.adminCatalogue,
      'admin-orders': Views.adminOrders,
    };

    const fn = views[view];
    if (fn) {
      fn(root, params);
    } else {
      root.innerHTML = '<div class="error-view"><h2>Page not found</h2></div>';
    }

    root.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function updateNav() {
    const session = Store.getSession();
    document.querySelectorAll('[data-nav-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.navView === currentView);
    });

    const cartCount = document.getElementById('cart-count');
    if (cartCount && session) {
      const n = Store.getCart(session.id).reduce((s, i) => s + i.quantity, 0);
      cartCount.textContent = n;
      cartCount.style.display = n > 0 ? 'inline-flex' : 'none';
    } else if (cartCount) {
      cartCount.style.display = 'none';
    }

    // Show/hide nav items based on session
    document.querySelectorAll('[data-requires-auth]').forEach(el => {
      el.style.display = session ? '' : 'none';
    });
    document.querySelectorAll('[data-requires-guest]').forEach(el => {
      el.style.display = session ? 'none' : '';
    });
    document.querySelectorAll('[data-requires-admin]').forEach(el => {
      el.style.display = (session && session.role === 'administrator') ? '' : 'none';
    });
    document.querySelectorAll('[data-requires-customer]').forEach(el => {
      el.style.display = (session && session.role === 'customer') ? '' : 'none';
    });

    const userNameEl = document.getElementById('nav-user-name');
    if (userNameEl) userNameEl.textContent = session ? session.name.split(' ')[0] : '';
  }

  function init() {
    Store.init();
    setupNav();

    window.addEventListener('popstate', (e) => {
      const state = e.state || { view: 'home', params: {} };
      render(state.view, state.params);
    });

    const hash = window.location.hash.slice(1) || 'home';
    const validViews = ['home','catalogue','cart','login','register','account','order-history','admin-dashboard','admin-catalogue','admin-orders'];
    const view = validViews.includes(hash) ? hash : 'home';
    render(view, {});
  }

  function setupNav() {
    document.querySelectorAll('[data-nav-view]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const view = el.dataset.navView;
        // Guard admin views
        if (view.startsWith('admin') && (!Store.getSession() || Store.getSession().role !== 'administrator')) {
          navigate('login', { redirect: view });
          return;
        }
        // Guard account views
        if (['account','order-history','cart','checkout'].includes(view) && !Store.getSession()) {
          navigate('login', { redirect: view });
          return;
        }
        navigate(view);
      });
    });

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Store.clearSession();
        navigate('home');
        showToast('Logged out successfully.', 'info');
      });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileMenuBtn && mobileNav) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
      });
    }
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function requireAuth(role) {
    const session = Store.getSession();
    if (!session) { navigate('login'); return null; }
    if (role && session.role !== role) { navigate('home'); return null; }
    return session;
  }

  return { init, navigate, render, updateNav, showToast, requireAuth };

})();
