(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DAHAM_CONVERSION_DOMAIN = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var allowed = {
    inquiry_click: true,
    inquiry_start: true,
    phone_click: true,
    generate_lead: true,
  };
  function clean(value) {
    return String(value == null ? "" : value).trim();
  }
  function safePath(value) {
    var path = clean(value).split(/[?#]/)[0];
    return /^\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]*$/.test(path) ? path : "/";
  }
  function buildEvent(name, input) {
    if (!allowed[name]) return null;
    input = input || {};
    var params = {};
    var location = clean(input.location);
    if (location) params.cta_location = location.slice(0, 80);
    params.page_path = safePath(input.pagePath);
    return { name: name, params: params };
  }
  return { buildEvent: buildEvent };
});
