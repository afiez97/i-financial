let csrfReady = false;

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie() {
  if (csrfReady) return;
  await fetch('/sanctum/csrf-cookie', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  csrfReady = true;
}

export class ApiError extends Error {
  constructor(status, body) {
    super('api_error');
    this.status = status;
    this.body = body || {};
  }

  /** Field -> first validation message, from a Laravel 422 error bag. */
  get errors() {
    return this.body.errors || {};
  }

  get message() {
    return this.body.message || 'Ralat tidak dijangka.';
  }
}

async function request(method, path, body) {
  const mutating = method !== 'GET';
  if (mutating) await ensureCsrfCookie();

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (mutating) {
    const token = getCookie('XSRF-TOKEN');
    if (token) headers['X-XSRF-TOKEN'] = token;
  }

  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }

  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
  primeCsrf: ensureCsrfCookie,
};
