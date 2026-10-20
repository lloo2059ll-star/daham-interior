-- Aligned with the applied production migration version.
-- Extend existing protected server outbox only; schedule and estimate payloads are not rewritten.
alter table public.notification_outbox drop constraint notification_outbox_kind_check;
alter table public.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('activity','schedule_one_hour','all_day_morning','test','material_order_week'));
alter table public.notification_outbox drop constraint notification_outbox_status_check;
alter table public.notification_outbox add constraint notification_outbox_status_check
  check (status in ('pending','sending','sent','partial','failed','cancelled'));
