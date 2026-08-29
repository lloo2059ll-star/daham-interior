(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DAHAM_PRICES = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function part(value) {
    return encodeURIComponent(String(value == null ? '' : value).normalize('NFC'));
  }

  function itemKey(section, item) {
    return [section.name, item.sub, item.det, item.unit].map(part).join('|');
  }

  function quantityKey(section, item) {
    return section.name + '|' + (item.sub || '') + '|' + (item.det || '');
  }

  function parseMoney(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || !/^\d{1,3}(?:,?\d{3})*$|^\d+$/.test(text)) return null;
    const number = Number(text.replaceAll(',', ''));
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  }

  function canManage(user) {
    return !!user && user.isActive === true && (user.role === 'owner' || user.role === 'admin');
  }

  function catalogKeys(catalog) {
    const keys = new Set();
    (catalog || []).forEach(section => (section.items || []).forEach(item => keys.add(itemKey(section, item))));
    return keys;
  }

  function validateOverrides(catalog, draft) {
    const allowed = catalogKeys(catalog);
    const result = {};
    Object.entries(draft || {}).forEach(([key, value]) => {
      if (!allowed.has(key)) throw new Error('존재하지 않는 품목입니다.');
      const labor = parseMoney(value && value.labor);
      const material = parseMoney(value && value.material);
      if (labor === null || material === null) throw new Error('올바른 금액을 입력하세요.');
      result[key] = { labor, material };
    });
    return result;
  }

  function basePrice(item) {
    return { labor: Number(item.lu) || 0, material: Number(item.mu) || 0 };
  }

  function overridePrice(section, item, overrides) {
    return (overrides && overrides[itemKey(section, item)]) || basePrice(item);
  }

  function snapshotExistingSelections(project, catalog) {
    if (!project) return project;
    project.priceSnapshots = project.priceSnapshots || {};
    const qtys = project.qtys || {};
    (catalog || []).forEach(section => (section.items || []).forEach(item => {
      const quantity = Number(qtys[quantityKey(section, item)] || 0);
      const key = itemKey(section, item);
      if (quantity > 0 && !project.priceSnapshots[key]) project.priceSnapshots[key] = basePrice(item);
    }));
    return project;
  }

  function priceForProject(project, section, item, overrides) {
    const key = itemKey(section, item);
    return project && project.priceSnapshots && project.priceSnapshots[key]
      ? project.priceSnapshots[key]
      : overridePrice(section, item, overrides);
  }

  function snapshotSelection(project, section, item, overrides) {
    if (!project) return null;
    project.priceSnapshots = project.priceSnapshots || {};
    const key = itemKey(section, item);
    if (!project.priceSnapshots[key]) {
      const price = overridePrice(section, item, overrides);
      project.priceSnapshots[key] = { labor: price.labor, material: price.material };
    }
    return project.priceSnapshots[key];
  }

  async function saveOverrides(options) {
    if (!canManage(options.user)) throw new Error('단가를 저장할 권한이 없습니다.');
    const priceOverrides = validateOverrides(options.catalog, options.draft);
    const settings = Object.assign({}, options.readSettings() || {}, { priceOverrides });
    await options.writeRemote(settings);
    options.writeLocal(settings);
    return settings;
  }

  return {
    itemKey, quantityKey, parseMoney, canManage, validateOverrides,
    snapshotExistingSelections, priceForProject, snapshotSelection, overridePrice,
    saveOverrides,
  };
});

