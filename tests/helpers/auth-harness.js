const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return data; }
  };
}

function createHarness({ page = 'login.html', initial = {}, routes = {} } = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  const redirects = [];
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; }
  };
  const location = {
    pathname: `/${page}`,
    href: page,
    replace(value) { redirects.push(value); this.href = value; }
  };
  const context = {
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    localStorage,
    location,
    fetch: async (url, options = {}) => {
      const request = { url: String(url), options };
      requests.push(request);
      const key = Object.keys(routes).find(candidate => request.url.includes(candidate));
      if (!key) throw new Error(`Unhandled request: ${request.url}`);
      const value = typeof routes[key] === 'function' ? await routes[key](request) : routes[key];
      return jsonResponse(value.status ?? 200, value.data ?? value);
    }
  };
  context.window = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'auth.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'auth.js' });
  return { auth: context.DAHAM_AUTH, requests, redirects, values, location };
}

module.exports = { createHarness };
