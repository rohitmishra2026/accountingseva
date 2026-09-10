-- ─────────────────────────────────────────────────────────────────────────
-- 20240102000000_sheet_schema_v2.sql
--
-- Moves the portal onto the current 4-tab Sheet schema (Clients / Holdings /
-- Monthly Returns / Categories) and re-points row-level security onto email.
--
-- RLS was ALREADY enabled on profiles, holdings, transactions and audit_log
-- before this migration (verified against production). This migration does not
-- turn RLS on for the first time; it re-points the holdings policy from
-- client_code to email and extends RLS to the two new tables.
--
-- Nothing here drops a column or deletes a row. Existing holdings are
-- backfilled onto the new columns so no history is lost.
-- ─────────────────────────────────────────────────────────────────────────

-- ── profiles.email ────────────────────────────────────────────────────────
-- Email is the Sheet's primary key, so the portal needs it on the profile to
-- resolve a Sheet row to an auth user. auth.uid() remains the trust anchor:
-- email is derived FROM the session, never trusted as an input.
alter table public.profiles
  add column if not exists email text;

update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id
   and u.email is not null
   and (p.email is null or p.email <> lower(u.email));

-- Stored lowercase, always. A stray capital in the Sheet must not orphan a
-- client, so the invariant is enforced by the database rather than by hope.
alter table public.profiles drop constraint if exists profiles_email_lowercase;
alter table public.profiles
  add constraint profiles_email_lowercase
  check (email is null or email = lower(email));

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- ── categories ────────────────────────────────────────────────────────────
-- Single source of truth for category order and chart colour. sub_category is
-- '' (not null) for a category-level row so it can sit in the primary key.
create table if not exists public.categories (
  category      text    not null,
  sub_category  text    not null default '',
  display_order integer not null default 999,
  color         text    not null default '#A6A6A6',
  synced_at     timestamptz not null default now(),
  primary key (category, sub_category)
);

comment on table public.categories is
  'Sheet-driven category ordering and colours. Never hardcode either in the app.';

-- ── monthly_returns ───────────────────────────────────────────────────────
create table if not exists public.monthly_returns (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  month           text not null,                 -- always YYYY-MM
  actual_pct      numeric(9,4),                  -- percentage points, e.g. 1.41
  expected_pct    numeric(9,4),
  portfolio_value numeric(16,2),
  synced_at       timestamptz not null default now(),
  constraint monthly_returns_email_lowercase check (email = lower(email)),
  constraint monthly_returns_month_fmt check (month ~ '^\d{4}-\d{2}$')
);

create unique index if not exists monthly_returns_email_month_idx
  on public.monthly_returns (lower(email), month);

comment on table public.monthly_returns is
  'Month-on-month actual vs expected return. Percentages stored as points (1.41 = 1.41%).';

-- ── holdings: new Sheet columns ───────────────────────────────────────────
alter table public.holdings
  add column if not exists email        text,
  add column if not exists report_month text,
  add column if not exists category     text,
  add column if not exists sub_category text,
  add column if not exists amc          text,
  add column if not exists folio        text,
  add column if not exists last_updated timestamptz;

-- Backfill from the old shape so existing rows survive and stay visible.
update public.holdings h
   set email = lower(p.email)
  from public.profiles p
 where p.client_code = h.client_code
   and h.email is null
   and p.email is not null;

update public.holdings
   set report_month = to_char(as_of_date, 'YYYY-MM')
 where report_month is null
   and as_of_date is not null;

update public.holdings
   set category = instrument_type
 where category is null
   and instrument_type is not null;

-- The old CHECK pinned instrument_type to six enum values. Categories are now
-- free text owned by the Categories tab, so the constraint has to go or every
-- sync would fail on the first real category name.
--
-- Dropped by DISCOVERY rather than by assumed name: `drop constraint if exists
-- holdings_instrument_type_check` relies on Postgres having auto-named it that
-- way, and if it did not, the drop silently succeeds while the constraint stays
-- and the first sync fails. This finds every CHECK on holdings that mentions
-- instrument_type and drops it by its real name.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'holdings'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%instrument_type%'
  loop
    execute format('alter table public.holdings drop constraint %I', c.conname);
    raise notice 'dropped CHECK constraint % on public.holdings', c.conname;
  end loop;
end $$;

alter table public.holdings alter column instrument_type drop not null;

-- as_of_date is superseded by report_month and is no longer written.
alter table public.holdings alter column as_of_date drop not null;

alter table public.holdings drop constraint if exists holdings_email_lowercase;
alter table public.holdings
  add constraint holdings_email_lowercase
  check (email is null or email = lower(email));

alter table public.holdings drop constraint if exists holdings_report_month_fmt;
alter table public.holdings
  add constraint holdings_report_month_fmt
  check (report_month is null or report_month ~ '^\d{4}-\d{2}$');

create index if not exists holdings_email_month_idx
  on public.holdings (lower(email), report_month);

-- ── current_client_email() ────────────────────────────────────────────────
-- SECURITY DEFINER so it can read profiles without tripping recursive RLS.
-- Anchored on auth.uid(): the JWT email is only a fallback for a session whose
-- profile row has no email yet, and can never be used to reach another
-- client's rows because the profile lookup wins whenever it returns a value.
create or replace function public.current_client_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(
    (select p.email from public.profiles p where p.id = auth.uid()),
    nullif(auth.jwt() ->> 'email', '')
  ));
$$;

revoke all on function public.current_client_email() from public;
grant execute on function public.current_client_email() to authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.categories      enable row level security;
alter table public.monthly_returns enable row level security;

-- holdings: re-pointed from client_code to email.
-- NOTE fail-closed by design: a row with a NULL email yields NULL from the
-- comparison, which is not true, so it is hidden rather than leaked.
drop policy if exists holdings_select_own on public.holdings;
create policy holdings_select_own
  on public.holdings for select
  to authenticated
  using (
    lower(email) = public.current_client_email()
    or public.is_admin()
  );

drop policy if exists monthly_returns_select_own on public.monthly_returns;
create policy monthly_returns_select_own
  on public.monthly_returns for select
  to authenticated
  using (
    lower(email) = public.current_client_email()
    or public.is_admin()
  );

-- categories holds no client data: it is reference data (labels, order,
-- colours) and every signed-in user needs all of it to render a chart legend.
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all
  on public.categories for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies anywhere: writes are service-role only.

-- ── Atomic per-month replace ──────────────────────────────────────────────
-- Delete-then-insert inside ONE function body, so it is one transaction. A
-- mid-write failure can no longer leave a client's month empty.
--
-- Scoped to (email, report_month). Prior months are untouchable by
-- construction: this function cannot see, let alone delete, a month other than
-- the one it was handed.
create or replace function public.replace_holdings_for_month(
  p_email        text,
  p_report_month text,
  p_rows         jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(p_email);
  v_count integer := 0;
begin
  if v_email is null or v_email = '' then
    raise exception 'replace_holdings_for_month: email is required';
  end if;
  if p_report_month is null or p_report_month !~ '^\d{4}-\d{2}$' then
    raise exception 'replace_holdings_for_month: bad report_month %', p_report_month;
  end if;

  delete from public.holdings
   where lower(email) = v_email
     and report_month = p_report_month;

  insert into public.holdings (
    client_code, email, report_month, category, sub_category, amc, folio,
    instrument_name, invested_amount, current_value, last_updated
  )
  select
    r->>'client_code',
    v_email,
    p_report_month,
    r->>'category',
    nullif(r->>'sub_category', ''),
    nullif(r->>'amc', ''),
    nullif(r->>'folio', ''),
    r->>'instrument_name',
    (r->>'invested_amount')::numeric,
    (r->>'current_value')::numeric,
    nullif(r->>'last_updated', '')::timestamptz
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r;

  select count(*)::integer into v_count
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb));

  return v_count;
end;
$$;

revoke all on function public.replace_holdings_for_month(text, text, jsonb) from public;
grant execute on function public.replace_holdings_for_month(text, text, jsonb) to service_role;

-- ── Atomic monthly-returns replace, per client ────────────────────────────
create or replace function public.replace_monthly_returns(
  p_email text,
  p_rows  jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(p_email);
  v_count integer := 0;
begin
  if v_email is null or v_email = '' then
    raise exception 'replace_monthly_returns: email is required';
  end if;

  delete from public.monthly_returns where lower(email) = v_email;

  insert into public.monthly_returns
    (email, month, actual_pct, expected_pct, portfolio_value)
  select
    v_email,
    r->>'month',
    nullif(r->>'actual_pct', '')::numeric,
    nullif(r->>'expected_pct', '')::numeric,
    nullif(r->>'portfolio_value', '')::numeric
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r;

  select count(*)::integer into v_count
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb));

  return v_count;
end;
$$;

revoke all on function public.replace_monthly_returns(text, jsonb) from public;
grant execute on function public.replace_monthly_returns(text, jsonb) to service_role;
