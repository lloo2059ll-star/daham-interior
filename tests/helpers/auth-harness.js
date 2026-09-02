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
  const appendedElements = [];
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; }
  };
  const location = {
    origin: 'https://lloo2059ll-star.github.io',
    pathname: `/${page}`,
    href: `https://lloo2059ll-star.github.io/daham-interior/${page}`,
    replace(value) { redirects.push(value); this.href = value; }
  };
  const head = {
    appendChild(element) {
      appendedElements.push(element);
      if (typeof element.onload === 'function') element.onload();
      return element;
    }
  };
  const document = {
    head,
    documentElement: head,
    createElement(tagName) {
      return {
        tagName: String(tagName).toUpperCase(),
        remove() {
          const index = appendedElements.indexOf(this);
          if (index >= 0) appendedElements.splice(index, 1);
        }
      };
    },
    getElementById(id) {
      return appendedElements.find(element => element.id === id) || null;
    },
    querySelector(selector) {
      if (selector === "link[rel='manifest']") {
        return appendedElements.find(element => element.tagName === 'LINK' && element.rel === 'manifest') || null;
      }
      return null;
    }
  };
  const context = {
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    localStorage,
    location,
    document,
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
  return { auth: context.DAHAM_AUTH, requests, redirects, values, location, appendedElements };
}

module.exports = { createHarness };
