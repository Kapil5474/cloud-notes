// ============================================================
// AUTH — login + signup against localStorage (see store.js).
// On signup we save YOUR name against YOUR account. Every other
// page reads the name from the current session's user record —
// never a hardcoded default — which is what stops "admin" (or
// anyone else) from showing up in the profile.
// ============================================================

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

showSignup?.addEventListener('click', () => {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
});
showLogin?.addEventListener('click', () => {
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
});

function setError(el, msg) {
  el.textContent = msg;
  el.classList.toggle('show', !!msg);
}

// already signed in? skip straight to the app
if (DB.getCurrentUser()) {
  window.location.href = 'app.html';
}

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  setError(loginError, '');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const user = DB.verifyLogin(email, password);
    DB.setSession(user.id);
    window.location.href = 'app.html';
  } catch (err) {
    setError(loginError, err.message);
  }
});

signupForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  setError(signupError, '');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (name.length < 2) { setError(signupError, 'Please enter your full name.'); return; }
  if (password.length < 6) { setError(signupError, 'Password should be at least 6 characters.'); return; }

  try {
    const user = DB.createUser({ name, email, password });
    DB.setSession(user.id);
    window.location.href = 'app.html';
  } catch (err) {
    setError(signupError, err.message);
  }
});
