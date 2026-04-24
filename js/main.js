'use strict';

/* ── Simple in-memory user store (localStorage backed) ── */
const users = JSON.parse(localStorage.getItem('bbp_users') || '{}');

function saveUsers() {
  localStorage.setItem('bbp_users', JSON.stringify(users));
}

/* ── Age Gate ─────────────────────────────────────────── */
function enterSite() {
  document.getElementById('age-gate').style.display = 'none';
  document.getElementById('auth-page').classList.add('active');
}

function denySite() {
  document.getElementById('age-gate').style.display = 'none';
  const d = document.getElementById('denied');
  d.style.display = 'flex';
}

/* ── Tab switching ────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', i === (tab === 'login' ? 0 : 1))
  );
  document.querySelectorAll('.auth-form').forEach((f, i) =>
    f.classList.toggle('active', i === (tab === 'login' ? 0 : 1))
  );
}

/* ── Login ────────────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const err   = document.getElementById('login-err');
  err.textContent = '';

  if (!email || !pass)        { err.textContent = 'Please fill in both fields.'; return; }
  if (!users[email])          { err.textContent = 'No account found — register below.'; return; }
  if (users[email].password !== pass) { err.textContent = 'Wrong password.'; return; }

  localStorage.setItem('bbp_session', email);
  window.location.href = 'dashboard.html';
}

/* ── Register ─────────────────────────────────────────── */
function doRegister() {
  const first = document.getElementById('reg-first').value.trim();
  const last  = document.getElementById('reg-last').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const err   = document.getElementById('reg-err');
  err.textContent = '';

  if (!first || !last || !email || !pass) { err.textContent = 'All fields are required.'; return; }
  if (pass.length < 6)                    { err.textContent = 'Password must be 6+ characters.'; return; }
  if (users[email])                       { err.textContent = 'That email is already registered.'; return; }

  users[email] = { firstName: first, lastName: last, email, password: pass };
  saveUsers();
  localStorage.setItem('bbp_session', email);
  window.location.href = 'dashboard.html';
}
