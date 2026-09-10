-- ─────────────────────────────────────────────────────────────────────────
-- 20240101000002_portfolio_summary_view.sql
-- Aggregated portfolio views. Return % is COMPUTED here, never stored:
--   return_pct = (current_value - invested_amount) / invested_amount * 100
--
-- IMPORTANT: security_invoker = true makes these views run with the querying
-- user's privileges, so RLS on the underlying tables (holdings) still applies.
-- Without it, PG15 views run as owner and would leak across clients.
-- ─────────────────────────────────────────────────────────────────────────

-- Per-instrument-type split for each client.
create or replace view public.portfolio_summary
with (security_invoker = true) as
select
  h.client_code,
  h.instrument_type,
  count(*)                                             as holdings_count,
  sum(h.invested_amount)                               as invested_amount,
  sum(h.current_value)                                 as current_value,
  sum(h.current_value) - sum(h.invested_amount)        as gain_loss,
  round(
    (sum(h.current_value) - sum(h.invested_amount))
      / nullif(sum(h.invested_amount), 0) * 100,
    2
  )                                                     as return_pct,
  max(h.as_of_date)                                     as as_of_date
from public.holdings h
group by h.client_code, h.instrument_type;

comment on view public.portfolio_summary is
  'Per client_code, per instrument_type totals with computed return_pct. RLS-aware (security_invoker).';

-- Grand totals per client (sum across all instrument types).
create or replace view public.portfolio_totals
with (security_invoker = true) as
select
  h.client_code,
  count(*)                                             as holdings_count,
  sum(h.invested_amount)                               as invested_amount,
  sum(h.current_value)                                 as current_value,
  sum(h.current_value) - sum(h.invested_amount)        as gain_loss,
  round(
    (sum(h.current_value) - sum(h.invested_amount))
      / nullif(sum(h.invested_amount), 0) * 100,
    2
  )                                                     as return_pct,
  max(h.as_of_date)                                     as as_of_date
from public.holdings h
group by h.client_code;

comment on view public.portfolio_totals is
  'Per client_code grand totals with computed return_pct. RLS-aware (security_invoker).';
