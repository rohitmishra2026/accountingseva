-- ─────────────────────────────────────────────────────────────────────────
-- 20240101000000_init_schema.sql
-- Core tables for AccountingSeva client portal.
-- Run order: this first, then RLS, then the view.
-- ─────────────────────────────────────────────────────────────────────────

-- gen_random_uuid() lives in pgcrypto; Supabase ships it, but be explicit.
create extension if not exists pgcrypto;

-- ── profiles ──────────────────────────────────────────────────────────────
-- One row per authenticated user. Created by an admin alongside the auth user.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  client_code text        unique not null,          -- e.g. 'ASV001'
  full_name   text        not null,
  phone       text,
  is_admin    boolean     not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Portal user profiles. client_code links a user to their portfolio rows.';

-- ── holdings ──────────────────────────────────────────────────────────────
-- Current portfolio positions. Replaced per client_code on each sync.
create table if not exists public.holdings (
  id              uuid          primary key default gen_random_uuid(),
  client_code     text          not null references public.profiles (client_code),
  instrument_type text          not null check (instrument_type in
                    ('equity','mutual_fund','debt','gold','fixed_deposit','other')),
  instrument_name text          not null,
  invested_amount numeric(14,2) not null,
  current_value   numeric(14,2) not null,
  as_of_date      date          not null,
  synced_at       timestamptz   not null default now()
);

create index if not exists holdings_client_code_idx
  on public.holdings (client_code);

comment on table public.holdings is
  'Portfolio holdings. Return % is computed downstream, never stored.';

-- ── transactions ──────────────────────────────────────────────────────────
-- Append-only ledger of buys/sells/dividends/interest.
create table if not exists public.transactions (
  id              uuid          primary key default gen_random_uuid(),
  client_code     text          not null references public.profiles (client_code),
  txn_date        date          not null,
  instrument_name text          not null,
  txn_type        text          not null check (txn_type in
                    ('buy','sell','dividend','interest')),
  amount          numeric(14,2) not null,
  synced_at       timestamptz   not null default now()
);

create index if not exists transactions_client_code_idx
  on public.transactions (client_code);

-- Natural key used by the sync job to dedupe appended transactions.
create unique index if not exists transactions_natural_key_idx
  on public.transactions (client_code, txn_date, instrument_name, txn_type, amount);

comment on table public.transactions is
  'Client transactions. Deduped on (client_code, txn_date, instrument_name, txn_type, amount).';

-- ── audit_log ─────────────────────────────────────────────────────────────
-- Security/audit trail. Written only via the service role. Never client-readable.
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  event      text        not null,   -- 'login', 'pdf_download', 'sync_run', ...
  metadata   jsonb,
  ip         text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_event_created_idx
  on public.audit_log (event, created_at desc);
