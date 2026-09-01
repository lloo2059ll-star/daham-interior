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

  function priceForProject(project, section, item, overrides, projectOverrides) {
    const key = itemKey(section, item);
    const scoped = project && projectOverrides && projectOverrides[project.id];
    if (scoped && scoped[key]) return scoped[key];
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

  function applyDraftToProject(project, catalog, draft) {
    if (!project) throw new Error('견적 프로젝트를 찾을 수 없습니다.');
    const prices = validateOverrides(catalog, draft);
    project.priceSnapshots = project.priceSnapshots || {};
    const qtys = project.qtys || {};
    (catalog || []).forEach(section => (section.items || []).forEach(item => {
      if (Number(qtys[quantityKey(section, item)] || 0) <= 0) return;
      const key = itemKey(section, item);
      project.priceSnapshots[key] = { labor: prices[key].labor, material: prices[key].material };
    }));
    return project;
  }

  function projectTotal(project, catalog, overrides, projectOverrides) {
    let labor = 0, material = 0;
    const qtys = project && project.qtys || {};
    (catalog || []).forEach(section => (section.items || []).forEach(item => {
      const quantity = Number(qtys[quantityKey(section, item)] || 0);
      if (quantity <= 0) return;
      const price = priceForProject(project, section, item, overrides, projectOverrides);
      labor += Math.round(quantity * price.labor * (item.k || 1) / 100) * 100;
      material += Math.round(quantity * price.material * (item.s || 1) / 100) * 100;
    }));
    const subtotal = labor + material;
    const rate = Number(project && project.margins && project.margins.profit || 15) / 100;
    return subtotal + Math.round(subtotal * rate / 100) * 100;
  }

  async function saveOverrides(options) {
    if (!canManage(options.user)) throw new Error('단가를 저장할 권한이 없습니다.');
    const priceOverrides = validateOverrides(options.catalog, options.draft);
    const settings = Object.assign({}, options.readSettings() || {}, { priceOverrides });
    await options.writeRemote(settings);
    options.writeLocal(settings);
    return settings;
  }

  async function saveProjectOverrides(options) {
    if (!canManage(options.user)) throw new Error('단가를 저장할 권한이 없습니다.');
    if (!options.project || !options.project.id) throw new Error('견적 프로젝트를 선택하세요.');
    const validated = validateOverrides(options.catalog, options.draft);
    const scoped = {};
    const qtys = options.project.qtys || {};
    (options.catalog || []).forEach(section => (section.items || []).forEach(item => {
      if (Number(qtys[quantityKey(section, item)] || 0) <= 0) return;
      const key = itemKey(section, item);
      scoped[key] = validated[key];
    }));
    const settings = Object.assign({}, options.readSettings() || {});
    settings.projectPriceOverrides = Object.assign({}, settings.projectPriceOverrides || {}, {
      [options.project.id]: scoped
    });
    const saved = await options.writeRemote(options.project.id, scoped);
    const finalSettings = saved || settings;
    options.writeLocal(finalSettings);
    return finalSettings;
  }

  function commercialIds(catalog) {
    return new Set((catalog || []).flatMap(section => (section.items || []).map(item => item.id)));
  }

  function saveCommercialDefaults(options) {
    const allowed = commercialIds(options.catalog);
    const validated = {};
    Object.entries(options.changes || {}).forEach(([id, value]) => {
      if (!allowed.has(id)) throw new Error('존재하지 않는 상가 견적 품목입니다.');
      const laborUnit = parseMoney(value && value.laborUnit);
      const materialUnit = parseMoney(value && value.materialUnit);
      if (laborUnit === null || materialUnit === null) throw new Error('올바른 금액을 입력하세요.');
      validated[id] = { laborUnit, materialUnit };
    });
    return Object.assign({}, options.currentSettings || {}, { commercialEstimateDefaults: validated });
  }

  function loadCommercialDefaults(catalog, settings) {
    const saved = settings && settings.commercialEstimateDefaults || {};
    return (catalog || []).map(section => Object.assign({}, section, {
      items: (section.items || []).map(item => Object.assign({}, item, saved[item.id] || {}))
    }));
  }

  return {
    itemKey, quantityKey, parseMoney, canManage, validateOverrides,
    snapshotExistingSelections, priceForProject, snapshotSelection, overridePrice, applyDraftToProject, projectTotal,
    saveOverrides, saveProjectOverrides, saveCommercialDefaults, loadCommercialDefaults,
  };
});

