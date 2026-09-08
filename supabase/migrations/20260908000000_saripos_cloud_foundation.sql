create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  account_status text not null default 'pending' check (account_status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'manager', 'cashier')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.plans (
  code text primary key,
  display_name text not null,
  price_centavos integer check (price_centavos is null or price_centavos >= 0),
  duration_days integer check (duration_days is null or duration_days > 0),
  max_devices integer not null check (max_devices > 0),
  offline_grace_days integer not null default 7 check (offline_grace_days between 1 and 3650),
  backup_limit integer not null default 2 check (backup_limit between 0 and 10000),
  backup_retention_days integer check (backup_retention_days is null or backup_retention_days > 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'suspended', 'cancelled')),
  starts_at timestamptz,
  expires_at timestamptz,
  max_devices_override integer check (max_devices_override is null or max_devices_override > 0),
  offline_grace_days_override integer check (offline_grace_days_override is null or offline_grace_days_override between 1 and 3650),
  backup_limit_override integer check (backup_limit_override is null or backup_limit_override between 0 and 10000),
  features_override jsonb not null default '{}'::jsonb,
  notes text not null default '',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_key text not null,
  device_name text not null default 'Android device',
  status text not null default 'active' check (status in ('active', 'revoked')),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (store_id, device_key)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  license_id uuid references public.licenses(id) on delete set null,
  amount_centavos integer not null check (amount_centavos >= 0),
  payment_method text not null default 'manual',
  reference text not null default '',
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete restrict,
  storage_path text not null unique,
  backup_kind text not null default 'manual' check (backup_kind in ('manual', 'automatic')),
  schema_version integer not null,
  app_version text not null,
  checksum_sha256 text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  exported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  store_id uuid references public.stores(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index store_members_user_id_idx on public.store_members(user_id);
create index devices_license_status_idx on public.devices(license_id, status);
create index backups_store_created_idx on public.backups(store_id, created_at desc);
create index payments_store_paid_idx on public.payments(store_id, paid_at desc);
create index audit_logs_store_created_idx on public.audit_logs(store_id, created_at desc);

create or replace function public.server_activate_device(
  p_user_id uuid,
  p_store_id uuid,
  p_device_key text,
  p_device_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_membership public.store_members%rowtype;
  selected_store public.stores%rowtype;
  selected_license public.licenses%rowtype;
  selected_plan public.plans%rowtype;
  selected_device public.devices%rowtype;
  active_device_count integer;
  effective_max_devices integer;
  effective_offline_days integer;
  effective_backup_limit integer;
  effective_backup_retention_days integer;
  effective_features jsonb;
  is_new_device boolean := false;
begin
  select * into selected_membership
  from public.store_members
  where user_id = p_user_id and (p_store_id is null or store_id = p_store_id)
  order by created_at
  limit 1;
  if not found then raise exception 'pending_approval'; end if;

  select * into selected_store from public.stores where id = selected_membership.store_id;
  if selected_store.status <> 'active' then raise exception 'store_%', selected_store.status; end if;

  select * into selected_license
  from public.licenses
  where store_id = selected_store.id
  for update;
  if not found then raise exception 'pending_approval'; end if;
  if selected_license.status <> 'active' then raise exception 'license_%', selected_license.status; end if;
  if selected_license.starts_at is not null and selected_license.starts_at > now() then raise exception 'license_not_started'; end if;
  if selected_license.expires_at is not null and selected_license.expires_at <= now() then raise exception 'license_expired'; end if;

  select * into selected_plan from public.plans where code = selected_license.plan_code;
  if not found or selected_plan.is_active is not true then raise exception 'plan_unavailable'; end if;
  effective_max_devices := coalesce(selected_license.max_devices_override, selected_plan.max_devices);
  effective_offline_days := coalesce(selected_license.offline_grace_days_override, selected_plan.offline_grace_days);
  effective_backup_limit := coalesce(selected_license.backup_limit_override, selected_plan.backup_limit);
  effective_backup_retention_days := selected_plan.backup_retention_days;
  effective_features := coalesce(selected_plan.features, '{}'::jsonb) || coalesce(selected_license.features_override, '{}'::jsonb);

  select * into selected_device
  from public.devices
  where store_id = selected_store.id and device_key = p_device_key;
  if found and selected_device.status = 'revoked' then raise exception 'device_revoked'; end if;

  if not found then
    select count(*) into active_device_count
    from public.devices where license_id = selected_license.id and status = 'active';
    if active_device_count >= effective_max_devices then raise exception 'device_limit_reached'; end if;
    insert into public.devices(store_id, license_id, device_key, device_name)
    values (selected_store.id, selected_license.id, p_device_key, left(coalesce(nullif(trim(p_device_name), ''), 'Android device'), 100))
    returning * into selected_device;
    is_new_device := true;
  else
    update public.devices set last_seen_at = now() where id = selected_device.id returning * into selected_device;
  end if;

  return jsonb_build_object(
    'membership', to_jsonb(selected_membership),
    'store', to_jsonb(selected_store),
    'license', to_jsonb(selected_license),
    'plan', to_jsonb(selected_plan),
    'device', to_jsonb(selected_device),
    'max_devices', effective_max_devices,
    'offline_grace_days', effective_offline_days,
    'backup_limit', effective_backup_limit,
    'backup_retention_days', effective_backup_retention_days,
    'is_new_device', is_new_device,
    'features', effective_features
  );
end;
$$;

revoke all on function public.server_activate_device(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.server_activate_device(uuid, uuid, text, text) to service_role;

insert into public.plans (code, display_name, duration_days, max_devices, offline_grace_days, backup_limit, backup_retention_days, features)
values
  ('trial', 'Trial', 7, 1, 3, 2, 7, '{"cloud_backup":true,"analytics":true}'::jsonb),
  ('basic', 'Basic', 30, 1, 7, 5, 30, '{"cloud_backup":true,"analytics":true}'::jsonb),
  ('standard', 'Standard', 365, 2, 30, 30, 30, '{"cloud_backup":true,"analytics":true,"multi_device":true}'::jsonb),
  ('business', 'Business', 365, 5, 30, 120, 90, '{"cloud_backup":true,"analytics":true,"multi_device":true,"staff_accounts":true}'::jsonb),
  ('lifetime', 'Lifetime', null, 2, 90, 120, 365, '{"cloud_backup":true,"analytics":true,"multi_device":true}'::jsonb)
on conflict (code) do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and account_status = 'active'
  );
$$;

create or replace function private.is_store_member(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members
    where store_id = target_store and user_id = (select auth.uid())
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on function private.handle_new_user() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_store_member(uuid) from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_store_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.plans enable row level security;
alter table public.licenses enable row level security;
alter table public.devices enable row level security;
alter table public.payments enable row level security;
alter table public.backups enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.profiles, public.stores, public.store_members, public.plans,
  public.licenses, public.devices, public.payments, public.backups, public.audit_logs
from anon, authenticated;

grant select on public.profiles, public.stores, public.store_members, public.plans,
  public.licenses, public.devices, public.payments, public.backups, public.audit_logs
to authenticated;

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy stores_read_member_or_admin on public.stores for select to authenticated
using ((select private.is_store_member(id)) or (select private.is_admin()));

create policy members_read_member_or_admin on public.store_members for select to authenticated
using ((select private.is_store_member(store_id)) or (select private.is_admin()));

create policy plans_read_active_or_admin on public.plans for select to authenticated
using (is_active or (select private.is_admin()));

create policy licenses_read_member_or_admin on public.licenses for select to authenticated
using ((select private.is_store_member(store_id)) or (select private.is_admin()));

create policy devices_read_member_or_admin on public.devices for select to authenticated
using ((select private.is_store_member(store_id)) or (select private.is_admin()));

create policy payments_read_member_or_admin on public.payments for select to authenticated
using ((select private.is_store_member(store_id)) or (select private.is_admin()));

create policy backups_read_member_or_admin on public.backups for select to authenticated
using ((select private.is_store_member(store_id)) or (select private.is_admin()));

create policy audit_read_member_or_admin on public.audit_logs for select to authenticated
using ((store_id is not null and (select private.is_store_member(store_id))) or (select private.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saripos-backups', 'saripos-backups', false, 5242880, array['application/vnd.saripos.backup+json'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client SELECT/INSERT/UPDATE/DELETE policy is created for saripos-backups.
-- Authenticated Edge Functions use the server secret only after membership and payload checks.
