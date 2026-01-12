(function() {
  'use strict';

  const AUTH_CONFIG = {
    tokenKey: 'tgr_token',
    userKey: 'tgr_user',
    loginPage: '/login.html',
    verifyEndpoint: '/api/auth-verify'
  };

  function getAllowedRoles() {
    const scripts = document.querySelectorAll('script[src*="auth.js"]');
    for (const script of scripts) {
      const roles = script.getAttribute('data-required-roles');
      if (roles) return roles.split(',').map(r => r.trim().toLowerCase());
    }
    return null;
  }

  function getToken() { return localStorage.getItem(AUTH_CONFIG.tokenKey); }

  function getUser() {
    const userStr = localStorage.getItem(AUTH_CONFIG.userKey);
    if (!userStr) return null;
    try { return JSON.parse(userStr); } catch { return null; }
  }

  function logout(reason) {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.userKey);
    const loginUrl = reason ? `${AUTH_CONFIG.loginPage}?reason=${encodeURIComponent(reason)}` : AUTH_CONFIG.loginPage;
    window.location.href = loginUrl;
  }

  async function verifyToken(token) {
    try {
      const response = await fetch(AUTH_CONFIG.verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      return data.valid ? data.user : null;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  function hasAccess(userRole, allowedRoles) {
    if (!allowedRoles) return true;
    return allowedRoles.includes(userRole.toLowerCase());
  }

  async function checkAuth() {
    const token = getToken();
    const allowedRoles = getAllowedRoles();

    if (!token) { logout('session_required'); return; }

    const user = await verifyToken(token);
    if (!user) { logout('session_expired'); return; }
    if (!hasAccess(user.role, allowedRoles)) { logout('access_denied'); return; }

    localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(user));
    window.TGR_USER = user;
    window.dispatchEvent(new CustomEvent('tgr:authenticated', { detail: { user } }));
    document.body.classList.add('authenticated');
  }

  window.TGR_AUTH = {
    getUser,
    getToken,
    logout: () => logout('user_logout'),
    isAuthenticated: () => !!getToken(),
    hasRole: (role) => { const user = getUser(); return user && user.role === role; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();
