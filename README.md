# NISSI storefront

A Next.js App Router storefront and Expo React Native companion app for the NISSI class MVP. Signed-in customers use the same Supabase account and database cart on the website and mobile app; Supabase Realtime sends cart changes between clients. Guest website bags are kept in the browser and merged into the customer's database cart after sign-in. Checkout captures Uganda delivery details and shows Cash on Delivery and a clearly labeled MoMo sandbox choice. The MTN MoMo option is a demo only; it makes no provider request and leaves payment pending.

## Run locally

1. Install a current Node.js LTS release.
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when configuring integrations. Never put a secret key or Mailgun secret in a `NEXT_PUBLIC_` variable. No secrets are included in this repository.

## Supabase setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor. It creates the catalogue and exact prices, demo stock of 100 units per variant, owner-scoped RLS policies, order snapshots, and a secret-key-protected transactional checkout RPC.
2. Run [`supabase/cart_sync.sql`](supabase/cart_sync.sql) in the same SQL editor. It creates user-owned cart tables, RLS policies, and enables Supabase Realtime for cart items. This migration is required by the mobile app and signed-in website cart.
3. Add the project URL and publishable key to `.env.local`.
4. Enable email/password and Google providers in Supabase Auth. Configure the local, preview and production redirect URLs in the Supabase and Google Cloud consoles.
5. Create a public-read product-media bucket only for approved product images; keep upload permission restricted to a trusted seed/admin process.

The SQL function `public.create_order` accepts authenticated user identity only from trusted server code, reloads active prices, locks and checks stock, creates the order and immutable line snapshots in one transaction, and decrements demo stock. Do not expose the secret key or call that function from a client. The application uses email/password and Google Supabase Auth, verifies the web session or mobile bearer token on the server, and creates orders through the secret-key-protected RPC. Order confirmation email uses Nodemailer with SMTP when configured, with the previous Mailgun API sender as a fallback. Email errors do not roll back an order. Nodemailer is a sending library and requires an SMTP mail service and credentials. No real payment credentials or production MoMo call are included. Configure project credentials and verify the deployed flow before accepting real customer orders.

## Configuration and launch inputs

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase project values.
- `SUPABASE_SECRET_KEY`: server-only, trusted checkout and controlled seed operations.
- `NEXT_PUBLIC_SITE_URL`: local/preview/production canonical site URL.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_EMAIL`: optional server-only Nodemailer SMTP setup. The SMTP service provider supplies these values.
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`: optional legacy Mailgun API fallback when SMTP is not configured.
- `NISSI_SUPPORT_EMAIL`: approved customer support address for confirmations.

Delivery is shown as “fee confirmed after order”; the numeric zero in the schema is a placeholder, not a promise of free delivery. No delivery date is promised. MoMo is only a sandbox demo choice and orders remain pending/unpaid until a verified provider integration exists. Confirm delivery policy, product descriptions/images, support contact, email domain, OAuth callbacks, and actual stock before launch.

## Deployment

The website is deployed on Vercel. Configure project credentials and matching Supabase Auth callback URLs before testing integrations. For the mobile app, see [`mobile/README.md`](mobile/README.md). Start it with Expo Go from the `mobile` folder; do not add a Supabase secret/service-role key to its environment. The mobile checkout calls the deployed website API, so set `EXPO_PUBLIC_SITE_URL` to the website origin. Run the cart migration above before testing cross-device cart sync.


