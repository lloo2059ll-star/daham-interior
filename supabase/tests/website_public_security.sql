begin;

insert into public.website_portfolio(source_project_id, slug, title, location, is_published, sort_order)
values
  ('website-test-public', 'website-test-public', '공개 테스트', '구미', true, 1),
  ('website-test-private', 'website-test-private', '비공개 테스트', '구미', false, 2)
on conflict (source_project_id) do update
set is_published = excluded.is_published, updated_at = now();

set local role anon;
select count(*) as published_rows_visible_to_anon
from public.website_portfolio
where source_project_id like 'website-test-%';

insert into public.website_inquiries(
  name, phone, email, address, address_detail, site_name, area, budget, move_date, message,
  privacy_consent, honeypot, source
) values (
  '홈페이지 테스트', '010-1111-2222', '', '경상북도 구미시', '', '테스트 현장', '34', '4000만원', null,
  '통합 테스트 문의', true, '', 'website'
);

reset role;

select case when exists (
  select 1
  from public.sync_data s,
       lateral jsonb_array_elements(s.value::jsonb) as item(record)
  where s.key = 'daham_consult_v1'
    and item.record ->> 'name' = '홈페이지 테스트'
    and item.record ->> 'tel' = '010-1111-2222'
    and item.record ->> 'source' = '홈페이지'
    and nullif(item.record ->> 'websiteInquiryId', '') is not null
) then 'ok' else 'missing' end as inquiry_synced_to_erp;

rollback;
