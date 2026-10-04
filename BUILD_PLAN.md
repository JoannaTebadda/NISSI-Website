# NISSI Website MVP Build Plan

## Product and delivery target

Build a responsive Ugandan clean-cooking storefront with the exact PRD catalogue, durable authenticated orders, owner-scoped order history, Cash on Delivery and an explicitly simulated MTN MoMo sandbox option. Keep delivery charges/timing configurable and undisclosed until confirmed. Use Next.js App Router on Vercel, Supabase Auth/Postgres/Storage, and Mailgun through server-only code.

## Phases

1. **Foundation:** establish the Vercel-compatible app, visual system, product catalogue/variants and responsive storefront; document local setup and environment variables.
2. **Shopping:** implement product selection and a refresh-persistent browser cart; validate quantities and show UGX subtotals.
3. **Identity and persistence:** add Supabase email/password and Google OAuth entry points, database schema/seed, RLS, and server-side checkout with trusted prices and stock validation.
4. **Order lifecycle:** add confirmation and owner-scoped order history, COD and clearly labeled MoMo simulation, and best-effort Mailgun order confirmation.
5. **Release readiness:** document Supabase/Vercel setup, missing credentials and launch assumptions; verify core flows where available.

## MVP data and security decisions

- Store UGX as integer amounts and seed the eleven confirmed variants exactly as specified; initial stock 100 is a configurable demo assumption.
- Start delivery at UGX 0 as a placeholder only where persistence requires a numeric value; the UI must say the delivery fee is confirmed after the order and must not promise a date.
- Cart prices are display-only. The trusted checkout path reloads current active variants/prices and checks stock.
- Customers read only their own profile, orders, and order items. Catalogue is public read-only. Order creation and stock mutation are trusted server operations.
- MoMo is a pending, simulated sandbox path; never label an order paid without provider verification. Email is best-effort after order commit.
- No real provider secrets or unverified product images/content are invented.

## Acceptance checkpoints

- Complete catalogue and prices match the PRD.
- Responsive catalogue/product/cart/checkout screens expose selected package and totals.
- Authentication and OAuth require Supabase project configuration and are documented.
- Persisted checkout, RLS-protected history, storage, Mailgun and Vercel deployment require external project credentials; provide schema and setup notes instead of fake integrations.
- Keep unresolved launch inputs (delivery policy, support contact, approved imagery/descriptions, OAuth/provider configuration) explicit.
