-- Cover every foreign-key column used by joins, deletes, and admin lookups.
create index if not exists stores_owner_user_id_idx
  on public.stores(owner_user_id);

create index if not exists licenses_plan_code_idx
  on public.licenses(plan_code);

create index if not exists licenses_approved_by_idx
  on public.licenses(approved_by);

create index if not exists payments_license_id_idx
  on public.payments(license_id);

create index if not exists payments_recorded_by_idx
  on public.payments(recorded_by);

create index if not exists backups_user_id_idx
  on public.backups(user_id);

create index if not exists backups_device_id_idx
  on public.backups(device_id);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs(actor_user_id);
