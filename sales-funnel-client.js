(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SALES_FUNNEL_CLIENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const DEFAULT_GOALS = { inquiry: 10, site_visit: 6, estimate_meeting: 4, contract: 2 };

  function parseArray(value) {
    try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  }

  function authorized(user) {
    return !!(user && user.isActive === true && (user.role === 'owner' || user.role === 'admin'));
  }

  function defaultTransport() {
    let client = null;
    function supabaseClient() {
      if (client) return client;
      if (!root.DAHAM_AUTH || !root.supabase) throw new Error('Supabase 연결을 초기화할 수 없습니다.');
      const config = root.DAHAM_AUTH.getSupabaseConfig();
      const token = root.DAHAM_AUTH.getAccessToken();
      client = root.supabase.createClient(config.url, config.key, {
        global: { headers: { Authorization: 'Bearer ' + token } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      return client;
    }
    return {
      async getCompanyId(userId) {
        const result = await supabaseClient().from('company_memberships').select('company_id').eq('profile_id', userId).eq('status', 'active').limit(1).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data || !result.data.company_id) throw new Error('활성 회사 정보를 찾을 수 없습니다.');
        return result.data.company_id;
      },
      async readSync(key) {
        const result = await supabaseClient().from('sync_data').select('value,updated_at').eq('key', key).maybeSingle();
        if (result.error) throw result.error;
        return result.data || null;
      },
      async readGoal(companyId, month) {
        const result = await supabaseClient().from('sales_funnel_goals')
          .select('company_id,month,inquiry_target,site_visit_target,estimate_meeting_target,contract_target,updated_at')
          .eq('company_id', companyId).eq('month', month + '-01').maybeSingle();
        if (result.error) throw result.error;
        return result.data || null;
      },
      async upsertGoal(payload) {
        const result = await supabaseClient().from('sales_funnel_goals').upsert(payload, { onConflict: 'company_id,month' })
          .select('company_id,month,inquiry_target,site_visit_target,estimate_meeting_target,contract_target,updated_at').single();
        if (result.error) throw result.error;
        return result.data;
      }
    };
  }

  function createSalesFunnelClient(deps) {
    deps = deps || {};
    const storage = deps.storage || root.localStorage;
    const transport = deps.transport || defaultTransport();
    const user = deps.user || (root.DAHAM_AUTH && root.DAHAM_AUTH.currentUser());
    let companyId = null;
    let lastOperation = null;

    function requireAccess() {
      if (!authorized(user)) throw new Error('영업 퍼널을 조회할 권한이 없습니다.');
    }
    async function company() {
      requireAccess();
      if (!companyId) companyId = await transport.getCompanyId(user.id);
      return companyId;
    }
    function localData(key) { return parseArray(storage && storage.getItem(key)); }
    function adoptRemote(key, row) {
      if (!row || typeof row.value !== 'string') return localData(key);
      const parsed = parseArray(row.value);
      const localTimestamp = storage.getItem(key + '_ts') || '';
      if (!localTimestamp || String(row.updated_at || '') > localTimestamp) {
        storage.setItem(key, JSON.stringify(parsed));
        if (row.updated_at) storage.setItem(key + '_ts', row.updated_at);
        return parsed;
      }
      return localData(key);
    }
    async function loadDashboard() {
      lastOperation = loadDashboard;
      requireAccess();
      await company();
      let records = localData('daham_consult_v1');
      let projects = localData('daham_detail_v2');
      let error = '';
      try {
        const rows = await Promise.all([transport.readSync('daham_consult_v1'), transport.readSync('daham_detail_v2')]);
        records = adoptRemote('daham_consult_v1', rows[0]);
        projects = adoptRemote('daham_detail_v2', rows[1]);
      } catch (caught) { error = caught && caught.message || '영업 데이터를 불러오지 못했습니다.'; }
      return { records: records, projects: projects, companyId: companyId, error: error };
    }
    function rowGoals(row) {
      return row ? {
        inquiry: Number(row.inquiry_target) || 0,
        site_visit: Number(row.site_visit_target) || 0,
        estimate_meeting: Number(row.estimate_meeting_target) || 0,
        contract: Number(row.contract_target) || 0
      } : { ...DEFAULT_GOALS };
    }
    async function loadGoals(month) {
      lastOperation = function () { return loadGoals(month); };
      try {
        const id = await company();
        const row = await transport.readGoal(id, month);
        return { goals: rowGoals(row), isDefault: !row, error: '', month: month };
      } catch (caught) {
        return { goals: { ...DEFAULT_GOALS }, isDefault: true, error: caught && caught.message || '저장된 목표를 불러오지 못했습니다.', month: month };
      }
    }
    async function saveGoals(month, goals) {
      lastOperation = function () { return saveGoals(month, goals); };
      const id = await company();
      const safe = {};
      Object.keys(DEFAULT_GOALS).forEach(function (key) {
        const value = Number(goals && goals[key]);
        if (!Number.isInteger(value) || value < 0) throw new Error('목표는 0 이상의 정수로 입력하세요.');
        safe[key] = value;
      });
      const row = await transport.upsertGoal({
        company_id: id,
        month: month + '-01',
        inquiry_target: safe.inquiry,
        site_visit_target: safe.site_visit,
        estimate_meeting_target: safe.estimate_meeting,
        contract_target: safe.contract,
        created_by: user.id,
        updated_by: user.id
      });
      if (storage) storage.setItem('daham_sales_funnel_goal_' + month, JSON.stringify(rowGoals(row || {
        inquiry_target: safe.inquiry, site_visit_target: safe.site_visit,
        estimate_meeting_target: safe.estimate_meeting, contract_target: safe.contract
      })));
      return { goals: rowGoals(row), isDefault: false, error: '', month: month };
    }
    function retry() { return lastOperation ? lastOperation() : Promise.reject(new Error('재시도할 작업이 없습니다.')); }
    return { loadDashboard: loadDashboard, loadGoals: loadGoals, saveGoals: saveGoals, retry: retry };
  }

  return { DEFAULT_GOALS: DEFAULT_GOALS, createSalesFunnelClient: createSalesFunnelClient };
});
