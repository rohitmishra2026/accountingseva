# AccountingSeva

Next.js website and authenticated client portal, configured for Netlify.

## Development

Install dependencies with `npm ci`, copy `.env.example` to `.env.local`, supply the required environment variables, and run `npm run dev`.

## Netlify

Import this repository, use `npm run build`, and configure the variables listed in `.env.example` in Netlify. The scheduled sync runs daily at 02:30 UTC. Configure Supabase authentication URLs for the deployed site before enabling client access.

## Checks

Run `npm test`, `npm run lint`, `npm run build`, and `npm run check:bundle`. Live tenant-isolation checks require separate test credentials: `npm run test:isolation`.

Keep real credentials, client data, and local environment files out of Git.
