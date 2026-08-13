import { api, ApiError } from './api.js';

export async function requireAuth() {
  try {
    return await api.get('/user');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = '/login.html';
      return null;
    }
    throw err;
  }
}

export async function login(email, password) {
  return api.post('/login', { email, password });
}

export async function register(name, email, password, passwordConfirmation) {
  return api.post('/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
}

export async function logout() {
  await api.post('/logout');
  window.location.href = '/login.html';
}

export async function forgotPassword(email) {
  return api.post('/forgot-password', { email });
}

export async function resetPassword(token, email, password, passwordConfirmation) {
  return api.post('/reset-password', {
    token,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
}

/** Redirects away from login/register pages if a session already exists. */
export async function redirectIfAuthenticated() {
  try {
    await api.get('/user');
    window.location.href = '/index.html';
  } catch {
    // Not authenticated — stay on the auth page.
  }
}
