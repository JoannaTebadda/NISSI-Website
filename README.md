# NISSI storefront

A Next.js App Router starter for the NISSI class MVP. The storefront includes the exact PRD catalogue, a mobile responsive catalogue and product variant selectors, and a cart persisted in the current browser. Checkout captures Uganda delivery details and shows the COD and clearly labeled MoMo sandbox choices. Authentication, secure checkout, order history, and a best-effort Mailgun confirmation path are implemented. Checkout stays unavailable until the required Supabase settings and SQL schema are configured. The MTN MoMo option is an explicitly labeled sandbox/demo choice only; it makes no provider request and leaves payment pending.

## Run locally

1. Install a current Node.js LTS release.
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when configuring integrations. Never put a secret key or Mailgun secret in a `NEXT_PUBLIC_` variable. No secrets are included in this repository.

## Supabase setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. It creates the catalogue and exact prices, demo stock of 100 units per variant, owner-scoped RLS policies, order snapshots, and a secret-key-protected transactional checkout RPC.
2. Add the project URL and publishable key to `.env.local`.
3. Enable email/password and Google providers in Supabase Auth. Configure the local, preview and production redirect URLs in the Supabase and Google Cloud consoles.
4. Create a public-read product-media bucket only for approved product images; keep upload permission restricted to a trusted seed/admin process.

The SQL function `public.create_order` accepts authenticated user identity only from trusted server code, reloads active prices, locks and checks stock, creates the order and immutable line snapshots in one transaction, and decrements demo stock. Do not expose the secret key or call that function from the browser. The application uses email/password and Google Supabase Auth, verifies the session on the server, and creates orders through the secret-key-protected RPC. Mailgun delivery runs after order commit and does not roll an order back on failure. No real payment credentials or production MoMo call are included. Configure project credentials and verify the deployed flow before accepting real customer orders.

## Configuration and launch inputs

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase project values.
- `SUPABASE_SECRET_KEY`: server-only, trusted checkout and controlled seed operations.
- `NEXT_PUBLIC_SITE_URL`: local/preview/production canonical site URL.
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`: server-only transactional email setup.
- `NISSI_SUPPORT_EMAIL`: approved customer support address for confirmations.

Delivery is shown as “fee confirmed after order”; the numeric zero in the schema is a placeholder, not a promise of free delivery. No delivery date is promised. MoMo is only a sandbox demo choice and orders remain pending/unpaid until a verified provider integration exists. Confirm delivery policy, product descriptions/images, support contact, email domain, OAuth callbacks, and actual stock before launch.

## Deployment

Import the repository into Vercel, set preview and production environment variables separately, and deploy. Configure the matching Supabase Auth callback URLs and verify the Mailgun sender domain. The MVP still requires end-to-end integration work for Supabase authentication/session handling, secure checkout API, owner order history, and post-commit best-effort Mailgun delivery before deployment can satisfy the full PRD.


