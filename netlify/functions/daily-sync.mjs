/**
 * Netlify's daily scheduler invokes this function on published production
 * deploys. It hands the work to a protected background function so the sync is
 * not constrained by the scheduler's 30-second execution limit.
 */
export default async function dailySync() {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    throw new Error("URL/NEXT_PUBLIC_SITE_URL and CRON_SECRET are required");
  }

  const response = await fetch(
    new URL("/.netlify/functions/daily-sync-worker", siteUrl),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (response.status !== 202) {
    const detail = (await response.text()).slice(0, 1_000);
    throw new Error(`Daily sync dispatch failed (${response.status}): ${detail}`);
  }
}
