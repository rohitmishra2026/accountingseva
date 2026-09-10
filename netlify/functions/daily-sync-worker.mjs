/**
 * Long-running half of the daily sync. Netlify acknowledges this function with
 * 202 immediately, then lets it run in the background for up to 15 minutes.
 */
export default async function dailySyncWorker(request) {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!siteUrl || !secret || authorization !== `Bearer ${secret}`) {
    throw new Error("Unauthorized daily sync dispatch");
  }

  const response = await fetch(new URL("/api/sync", siteUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_000);
    throw new Error(`Daily sync failed (${response.status}): ${detail}`);
  }
}

export const config = {
  background: true,
  path: "/.netlify/functions/daily-sync-worker",
};
