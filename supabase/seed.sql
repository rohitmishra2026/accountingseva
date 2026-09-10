-- ─────────────────────────────────────────────────────────────────────────
-- supabase/seed.sql
-- Dummy data for LOCAL TESTING ONLY. Two clients with realistic holdings and
-- transactions, plus one admin.
--
-- NOTE: profiles.id references auth.users(id). This seed creates matching
-- auth.users rows so the FK is satisfied. The passwords below are bcrypt
-- hashes of 'password123' — change or remove before using anywhere real.
-- Run AFTER the migrations, e.g. via `supabase db reset` (which applies
-- migrations then seed.sql) or by pasting into the SQL editor on a dev project.
-- ─────────────────────────────────────────────────────────────────────────

-- Fixed UUIDs so the FKs line up deterministically.
-- Client 1: ASV001, Client 2: ASV002, Admin: ASV000.
do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-000000000000';
  c1_id    uuid := '11111111-1111-1111-1111-111111111111';
  c2_id    uuid := '22222222-2222-2222-2222-222222222222';
  pw       text := crypt('password123', gen_salt('bf'));
begin
  -- auth.users (minimal columns needed for password login on local Supabase)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@accountingseva.in', pw, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{}'),
    (c1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ravi@example.com', pw, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{}'),
    (c2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'meera@example.com', pw, now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{}')
  on conflict (id) do nothing;
end $$;

-- profiles
-- email is required now: RLS resolves the caller's rows through it, so a
-- profile without one is invisible to its own client (fail-closed by design).
insert into public.profiles (id, client_code, full_name, phone, is_admin, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ASV000', 'Firm Admin', '+91 9000000000', true,  'admin@accountingseva.in'),
  ('11111111-1111-1111-1111-111111111111', 'ASV001', 'Ravi Naik', '+91 9822011111', false, 'ravi@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'ASV002', 'Meera Kamat', '+91 9822022222', false, 'meera@example.com')
on conflict (id) do nothing;

-- categories — the Sheet's Categories tab. Ordering and colours live here, not
-- in the app.
insert into public.categories (category, sub_category, display_order, color)
values
  ('DMAT Holdings / Shares',        '',                        1, '#2E75B6'),
  ('Mutual Funds',                  '',                        2, '#70AD47'),
  ('Mutual Funds',                  'Equity M.F',              2, '#70AD47'),
  ('Mutual Funds',                  'Debt M.F',                2, '#70AD47'),
  ('Fixed Income',                  '',                        3, '#E0B92C'),
  ('Fixed Income',                  'Bonds',                   3, '#E0B92C'),
  ('Commodities (Held Physically)', '',                        4, '#E07A7A'),
  ('Cash & Equivalents',            '',                        5, '#F0A94A'),
  ('Cash & Equivalents',            'Bank FDs',                5, '#F0A94A')
on conflict (category, sub_category) do nothing;

-- holdings — client ASV001
-- Two report months, so the immutable-prior-month behaviour is exercisable
-- locally: a sync carrying only 2026-07 must leave 2026-06 untouched.
insert into public.holdings
  (client_code, email, report_month, category, sub_category, instrument_name, invested_amount, current_value)
values
  ('ASV001', 'ravi@example.com', '2026-07', 'DMAT Holdings / Shares',        null,         'Reliance Industries',      200000.00, 268000.00),
  ('ASV001', 'ravi@example.com', '2026-07', 'DMAT Holdings / Shares',        null,         'HDFC Bank',                150000.00, 171500.00),
  ('ASV001', 'ravi@example.com', '2026-07', 'Mutual Funds',                  'Equity M.F', 'Parag Parikh Flexi Cap',   150000.00, 189000.00),
  ('ASV001', 'ravi@example.com', '2026-07', 'Commodities (Held Physically)', null,         'Sovereign Gold Bond 2031', 100000.00, 118500.00),
  -- A real loss, so the loss path is never unexercised locally either.
  ('ASV001', 'ravi@example.com', '2026-07', 'Mutual Funds',                  'Debt M.F',   'SBI Corporate Bond Fund',  120000.00, 116400.00),
  ('ASV001', 'ravi@example.com', '2026-07', 'Cash & Equivalents',            'Bank FDs',   'HDFC Bank FD (5yr)',       300000.00, 322000.00),
  -- Prior month: must survive a sync that only carries 2026-07.
  ('ASV001', 'ravi@example.com', '2026-06', 'DMAT Holdings / Shares',        null,         'Reliance Industries',      200000.00, 254000.00),
  ('ASV001', 'ravi@example.com', '2026-06', 'Mutual Funds',                  'Equity M.F', 'Parag Parikh Flexi Cap',   150000.00, 181000.00);

-- holdings — client ASV002
insert into public.holdings
  (client_code, email, report_month, category, sub_category, instrument_name, invested_amount, current_value)
values
  ('ASV002', 'meera@example.com', '2026-07', 'Mutual Funds',       'Equity M.F', 'UTI Nifty 50 Index',  250000.00, 296000.00),
  ('ASV002', 'meera@example.com', '2026-07', 'DMAT Holdings / Shares', null,     'Infosys',             180000.00, 165000.00),
  ('ASV002', 'meera@example.com', '2026-07', 'Cash & Equivalents', 'Bank FDs',   'ICICI Bank FD',       200000.00, 214000.00),
  ('ASV002', 'meera@example.com', '2026-07', 'Fixed Income',       'Bonds',      'REC Tax-Free Bonds',   90000.00,  98500.00);

-- monthly returns — only ASV001 has a series, mirroring production where three
-- of four clients have none at all (Chart C hides itself for the others).
insert into public.monthly_returns (email, month, actual_pct, expected_pct)
values
  ('ravi@example.com', '2026-02', 1.5, 1.0),
  ('ravi@example.com', '2026-03', 1.3, 0.9),
  ('ravi@example.com', '2026-04', 1.1, 0.8),
  ('ravi@example.com', '2026-05', 1.6, 1.0),
  ('ravi@example.com', '2026-06', -0.4, 0.8),
  ('ravi@example.com', '2026-07', 1.4, 0.9);
-- No ON CONFLICT here: the unique index is on (lower(email), month), which an
-- ON CONFLICT column list cannot target. The seed runs on a fresh reset anyway.

-- transactions — ASV001
insert into public.transactions
  (client_code, txn_date, instrument_name, txn_type, amount)
values
  ('ASV001', '2026-07-05', 'Reliance Industries',    'buy',      50000.00),
  ('ASV001', '2026-06-28', 'Parag Parikh Flexi Cap', 'buy',      25000.00),
  ('ASV001', '2026-06-15', 'Sovereign Gold Bond 2031','interest', 2500.00),
  ('ASV001', '2026-05-30', 'Reliance Industries',    'dividend',  1800.00),
  ('ASV001', '2026-05-12', 'SBI Corporate Bond Fund','sell',     15000.00);

-- transactions — ASV002
insert into public.transactions
  (client_code, txn_date, instrument_name, txn_type, amount)
values
  ('ASV002', '2026-07-01', 'UTI Nifty 50 Index', 'buy',      40000.00),
  ('ASV002', '2026-06-20', 'Infosys',            'buy',      30000.00),
  ('ASV002', '2026-06-05', 'REC Tax-Free Bonds', 'interest',  4200.00),
  ('ASV002', '2026-05-25', 'ICICI Bank FD',      'interest',  3100.00);
