-- ─────────────────────────────────────────────────────────────────────────
-- P0 FIX: close the unauthenticated write path into holdings / monthly_returns.
--
-- THE BUG
-- replace_holdings_for_month() and replace_monthly_returns() are SECURITY
-- DEFINER, take the target client's email as a plain argument, and delete that
-- client's rows before re-inserting from p_rows. They contain no caller-identity
-- check of any kind, by design: only the sync (service role) was ever meant to
-- reach them.
--
-- They were locked with `revoke all ... from public`. That is not sufficient.
-- Every Supabase project bootstraps with
--     alter default privileges in schema public
--       grant all on functions to postgres, anon, authenticated, service_role;
-- applied for the postgres role. Both the SQL editor and `supabase db push` run
-- as postgres, so at CREATE FUNCTION time each function receives EXPLICIT
-- execute grants to anon and authenticated. `revoke ... from public` removes
-- only the implicit PUBLIC entry in the ACL and leaves those explicit grants
-- untouched. PostgREST then exposes anything the request role can execute at
-- POST /rest/v1/rpc/<name>.
--
-- The anon key is NEXT_PUBLIC and ships in the browser bundle, so the write
-- path was reachable with no account at all.
--
-- VERIFIED against the live database on 25 Aug 2026. Calling either function
-- as anon with an empty email returned the function's OWN guard:
--     {"code":"P0001","message":"replace_holdings_for_month: email is required"}
-- That guard runs only after the permission check has passed, so anon held
-- EXECUTE. A read of holdings as anon over the same connection correctly
-- returned [], confirming RLS was protecting reads while this bypassed it for
-- writes. The empty-email probe was chosen deliberately: the guard raises
-- before the DELETE, so nothing was mutated to prove the point.
--
-- THE FIX
-- Revoke the roles explicitly rather than relying on the PUBLIC revoke, and
-- stop the same mistake recurring for functions added later.
--
-- SAFE TO APPLY: the sync calls both functions through the service-role client
-- (src/lib/sync/run.ts:251 and :282), and service_role keeps its explicit grant.
-- Nothing in the portal read path touches these functions.
--
-- NOTE: this migration deliberately does NOT `create or replace` the function
-- bodies to add an in-body identity check. The live schema was applied by hand
-- via the SQL editor rather than through this migrations directory, so the
-- deployed bodies cannot be diffed against this repo; recreating them from
-- repo text risks silently reverting the live definitions. Revoking EXECUTE
-- closes the hole completely on its own.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Remove the explicit grants Supabase's default privileges handed out.
revoke all on function public.replace_holdings_for_month(text, text, jsonb)
  from anon, authenticated;
revoke all on function public.replace_monthly_returns(text, jsonb)
  from anon, authenticated;

-- 2. Re-assert the intended grant. Idempotent; states the intent explicitly.
grant execute on function public.replace_holdings_for_month(text, text, jsonb)
  to service_role;
grant execute on function public.replace_monthly_returns(text, jsonb)
  to service_role;

-- 3. Stop the next SECURITY DEFINER function inheriting the same hole.
--    Affects only functions created later by the role running this.
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;
