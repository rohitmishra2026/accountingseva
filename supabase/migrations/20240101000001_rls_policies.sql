-- ─────────────────────────────────────────────────────────────────────────
-- 20240101000001_rls_policies.sql
-- Row Level Security. Enable on ALL tables. Regular users get SELECT-only,
-- scoped to their own data. Writes happen exclusively via the service role
-- (which bypasses RLS). Admins get read-all via SECURITY DEFINER helpers.
-- ─────────────────────────────────────────────────────────────────────────

-- ── SECURITY DEFINER helpers ──────────────────────────────────────────────
-- These bypass RLS (they run as the function owner), which is exactly what we
-- need to check a caller's own profile WITHOUT triggering recursive RLS on
-- the profiles table.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_client_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.client_code from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_client_code() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_client_code() to authenticated;

-- ── Enable RLS everywhere ─────────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.holdings     enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_log    enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────
-- A user may read only their own row. Admins may read all.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- No INSERT/UPDATE/DELETE policies: those operations are service-role only.

-- ── holdings ──────────────────────────────────────────────────────────────
-- A user may read only rows whose client_code matches their profile. Admins all.
drop policy if exists holdings_select_own on public.holdings;
create policy holdings_select_own
  on public.holdings for select
  to authenticated
  using (client_code = public.current_client_code() or public.is_admin());

-- ── transactions ──────────────────────────────────────────────────────────
drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
  on public.transactions for select
  to authenticated
  using (client_code = public.current_client_code() or public.is_admin());

-- ── audit_log ─────────────────────────────────────────────────────────────
-- No client access at all. RLS is enabled with zero permissive policies, so
-- every non-service-role read/write is denied by default. The service role
-- bypasses RLS and is the only writer/reader from application code.
-- (Intentionally no CREATE POLICY statements here.)
