alter table public.website_portfolio
  add column if not exists gallery_image_urls jsonb not null default '[]'::jsonb;

alter table public.website_portfolio
  drop constraint if exists website_portfolio_gallery_image_urls_array;

alter table public.website_portfolio
  add constraint website_portfolio_gallery_image_urls_array
  check (jsonb_typeof(gallery_image_urls) = 'array');
