# NISSI Website Product Requirements Document

**Document status:** MVP specification for class project  
**Version:** 1.0  
**Date:** 2 October 2026  
**Product:** NISSI Website  
**Currency:** Ugandan shillings (UGX)

## 1. Product overview

NISSI Website is a responsive e-commerce website for NISSI, a Ugandan manufacturer of clean-cooking fuels and appliances. Customers can browse briquettes, pellets, stoves, and fire lighters; add products to a cart; check out; pay by Cash on Delivery or through an MTN MoMo sandbox flow; receive an order confirmation email; and return later to view their order history.

This document prioritizes the class submission MVP. It records a path for later improvements without making those features a requirement for the initial build.

## 2. Problem statement

Customers need a reliable way to learn about NISSI products, see package sizes and prices, place an order remotely, and receive confirmation. A static brochure site cannot demonstrate the required persistent data, authentication, checkout, and order-history integrations. NISSI needs a small but functional commerce experience that can be deployed on Vercel and extended after assessment.

## 3. Goals and non-goals

### Goals

- Present the confirmed NISSI product catalogue and prices clearly.
- Support account creation and sign-in with email/password and Google.
- Support a persistent cart through checkout and create durable orders.
- Let signed-in customers review their own past orders after closing and reopening the site.
- Offer Uganda-wide delivery address capture and the two MVP payment methods.
- Send an order confirmation email using Mailgun.
- Use Supabase PostgreSQL, Supabase Auth, and Supabase Storage, with row-level security.
- Deploy the application to Vercel.
- Keep the implementation small enough for the class MVP and document post-MVP work separately.

### Non-goals for the class MVP

No admin dashboard, inventory management UI, live courier integration, real-money MoMo collection, refunds, subscriptions, discount engine, ratings, wishlists, advanced analytics, or multi-vendor functions are required. Product content may be seeded or maintained through a simple controlled process until an admin interface is justified.

## 4. Users

- **Shopper:** Browses products and prices, adds items to cart, and places an order.
- **Registered customer:** Signs in, checks out, receives confirmation, and views their order history.
- **NISSI operator:** Receives orders and fulfills them manually during the MVP. No operator-facing dashboard is required for the class submission.

## 5. Scope and release boundaries

### Exam MVP

- Responsive storefront and product catalogue with product/package variants.
- Product detail view and add-to-cart controls.
- Cart quantity changes, item removal, subtotal, and checkout.
- Email/password and Google authentication through Supabase Auth.
- Checkout contact and Uganda delivery-address capture.
- Cash on Delivery and MTN MoMo sandbox payment placeholder/flow.
- Persistent order and order-item records in Supabase PostgreSQL.
- Customer order history with access limited to the signed-in owner.
- Mailgun order confirmation email initiated by trusted server-side logic.
- Supabase Storage for product images where needed.
- Vercel deployment with secrets kept in server-side environment variables.

### Post-MVP

Admin product/order/inventory management; stock reservation and low-stock alerts; production MTN MoMo onboarding and collections; richer delivery pricing and courier coordination; order status updates; customer service tools; search/filtering; reviews and ratings; wishlist; coupons; abandoned-cart email; WhatsApp; analytics; accessibility and performance improvements beyond the initial acceptance baseline.

## 6. Product catalogue and confirmed pricing

All prices are UGX. A product with multiple package sizes is represented as purchasable variants, each with its own price and stock count.

| Product | Variant | Price |
|---|---:|---:|
| Stick briquettes | 10 kg | UGX 15,000 |
| Stick briquettes | 20 kg | UGX 40,000 |
| Stick briquettes | 50 kg | UGX 80,000 |
| Honeycomb briquettes | 1 piece | UGX 2,000 |
| Honeycomb briquettes | Bag of 10 pieces | UGX 20,000 |
| Pellets | 10 kg | UGX 10,000 |
| Pellets | 20 kg | UGX 20,000 |
| Pellets | 50 kg | UGX 50,000 |
| Industrial stove | One stove | UGX 2,700,000 |
| Domestic stove | One stove | UGX 50,000 |
| Fire lighters | One pack | UGX 10,000 |

The honeycomb bag price follows the confirmed unit price and 10-piece pack quantity. Product descriptions, images, packaging specifics for lighters/stoves, and any tax treatment are content/configuration details to confirm before launch. Do not silently change confirmed prices.

### MVP stock assumption

Use a configurable initial seed of **100 sellable units per variant** as a practical demo inventory assumption, not a business-confirmed forecast. For bagged products, a sellable unit means one package of the listed size; for single-item products, it means one item/pack. Allow the seed value to be changed without code redesign. Prevent checkout quantities from exceeding available stock if stock enforcement is enabled. A full stock administration workflow is deferred.

## 7. User journeys

### Browse and add to cart

1. Shopper opens the storefront and sees product categories and prices.
2. Shopper opens a product, selects a package/variant and quantity.
3. Shopper adds it to the cart and sees the updated item count and subtotal.
4. Shopper can change quantities or remove lines from the cart.

### Checkout and order creation

1. Customer proceeds to checkout; if signed out, the app requests sign-in or account creation and then returns to checkout.
2. Customer provides name, email, phone number, district/city, address details, and delivery notes if needed.
3. Customer selects Cash on Delivery or MTN MoMo sandbox.
4. The server validates the cart, current prices, quantities, address, and payment selection, then creates an order and immutable order-item price snapshots.
5. The customer sees a clear order confirmation page with order reference, total, payment method/status, and delivery address summary.
6. The system sends a confirmation email when the order is committed.

### Return and view orders

1. Customer closes and later reopens the website.
2. Customer signs in with the same account.
3. Customer opens order history and sees their previous orders and basic status/summary.
4. Customer cannot access another customer's order by changing a URL or request identifier.

## 8. Functional requirements and acceptance criteria

### Catalogue

- **FR-01:** The storefront shall show active products and purchasable variants with UGX prices.
  - **Accept:** All confirmed catalogue rows above are represented accurately; inactive items are not offered for purchase.
- **FR-02:** Product pages shall show a description, image when available, variant, price, and add-to-cart action.
  - **Accept:** A shopper can identify the selected size/pack and its exact price before adding it.

### Cart and checkout

- **FR-03:** A shopper shall add, update, and remove cart lines.
  - **Accept:** Line totals and subtotal update correctly; invalid or zero quantities are rejected.
- **FR-04:** Cart data shall survive ordinary page navigation and refresh for the active browser session/device.
  - **Accept:** Refreshing does not unexpectedly empty the cart. Cross-device cart sync is not required for MVP.
- **FR-05:** Checkout shall collect customer contact information and a Uganda delivery address.
  - **Accept:** Required fields are validated, and the customer can review items, quantities, subtotal, delivery fee (if configured), and total before placing the order.
- **FR-06:** The server shall calculate totals from trusted product/variant prices, not client-submitted prices.
  - **Accept:** Tampering with client requests cannot change a stored unit price or total.
- **FR-07:** Successful checkout shall persist an order and its line-item snapshots.
  - **Accept:** Each order has a unique reference, owner, currency, amounts, payment method/status, delivery details, and creation time; each line records product/variant identity, name/description snapshot, quantity, unit price, and line total.
- **FR-08:** Customers shall be able to see their own orders.
  - **Accept:** Order history remains available after logout/login and page reopen; unauthorized users cannot read another customer's orders.

### Authentication

- **FR-09:** Customers shall register and sign in with email/password using Supabase Auth.
  - **Accept:** Valid credentials establish a persistent session; invalid credentials produce a helpful error without exposing secrets.
- **FR-10:** Customers shall be able to sign in with Google OAuth configured through Google Cloud Console and Supabase Auth.
  - **Accept:** A successful OAuth callback returns the user to the storefront or checkout with their session intact.
- **FR-11:** Customers shall be able to sign out.
  - **Accept:** Sign-out clears the active session; protected order views require authentication.

### Payment

- **FR-12:** Cash on Delivery shall be selectable at checkout.
  - **Accept:** The order is created with payment method `cash_on_delivery` and an unpaid/pending collection state; the confirmation clearly says payment is due on delivery.
- **FR-13:** The MVP shall include an MTN MoMo sandbox integration placeholder, designed for a future request-to-pay flow.
  - **Accept:** The UI identifies sandbox/demo status; no production credentials or real-money claim is made. If live sandbox credentials are unavailable, a clearly labeled simulated/pending result may be used. Order payment status must not be marked paid unless a trusted provider response verifies it.
  - **Integration boundary:** Keep provider calls server-side. Future flow: create payment request with unique reference → customer approves sandbox prompt → verify callback or poll transaction status → update payment state idempotently. Store provider reference and status; never store MoMo PINs or credentials in the browser/database.

### Email

- **FR-14:** A committed order shall trigger a Mailgun confirmation email.
  - **Accept:** Email includes NISSI, order reference, item/quantity/price summary, total, payment method, delivery destination summary, and support contact configured for the project.
  - **Reliability:** Email failure must not erase or roll back a valid order. Record/log failure safely for retry or operator follow-up; do not expose provider response details to customers.

### Delivery

- **FR-15:** Checkout shall accept delivery destinations across Uganda.
  - **Accept:** Customer can enter district/city, address/landmark, recipient name, and phone; the form does not restrict ordering to one city.
- **FR-16:** Delivery charge and delivery timing shall be visible before order placement.
  - **Accept:** Until NISSI confirms a nationwide fee/rate table, use an explicitly configurable delivery charge policy (such as “fee confirmed after order”) and do not invent a fixed delivery price or promise a delivery date. If the class demo needs a numeric fee, label it as a temporary demo assumption in configuration and UI.

## 9. Payment and order states

Suggested order statuses: `pending`, `confirmed`, `processing`, `dispatched`, `delivered`, `cancelled`. Suggested payment statuses: `pending`, `paid`, `failed`, `not_applicable`, `refunded`. Cash on Delivery orders start with payment `pending`. MTN sandbox orders remain `pending` until a verified provider response changes state. State transitions should be validated server-side and provider callbacks must be idempotent.

## 10. Technical architecture

- **Web application:** Responsive web frontend and server-side endpoints/actions for trusted checkout, email, and payment-provider operations. Framework choice is to be settled during implementation, favoring a Vercel-compatible stack.
- **Supabase PostgreSQL:** Persistent product, variant, order, and order-item data.
- **Supabase Auth:** Email/password sessions and Google OAuth.
- **Supabase Storage:** Product image assets; use public read access only for deliberately public product media, with uploads restricted to trusted administrators/seed process.
- **Mailgun:** Transactional order confirmation from a server-side function/endpoint.
- **MTN MoMo:** Sandbox request-to-pay adapter/placeholder; production connection deferred pending merchant setup and credentials.
- **Vercel:** Hosting and deployment. Configure preview and production environment variables separately. Never commit secrets.

Request flow: Browser → Vercel-hosted application → Supabase Auth/database; trusted server endpoint validates checkout and writes order → Mailgun email; optional server endpoint → MTN sandbox → verified result updates payment status.

## 11. Data model

Suggested logical schema; final SQL types, constraints, and naming may be adjusted during implementation.

### `profiles`

- `id` UUID primary key, references `auth.users.id`.
- `full_name` nullable text; `phone` nullable text; `created_at` timestamp.
- Created/updated through trusted flow or carefully scoped self-service policy.

### `products`

- `id` UUID primary key; `slug` unique text; `name` text; `category` text.
- `description` text; `image_path` nullable text; `is_active` boolean.
- `created_at`, `updated_at` timestamps.

### `product_variants`

- `id` UUID primary key; `product_id` foreign key.
- `name` text (e.g. “10 kg”); `sku` nullable unique text.
- `unit_label` text; `unit_price_ugx` integer, nonnegative.
- `stock_quantity` integer, nonnegative; `is_active` boolean.
- Store money as integer UGX, never floating point.

### `orders`

- `id` UUID primary key; `order_number` unique human-readable reference.
- `user_id` UUID references `auth.users.id`.
- `status` text/enum; `payment_method` text/enum; `payment_status` text/enum.
- `currency` fixed to `UGX`; `subtotal_ugx`, `delivery_fee_ugx`, `total_ugx` integers.
- `customer_name`, `customer_email`, `customer_phone` text.
- `delivery_district`, `delivery_city`, `delivery_address`, `delivery_notes` text.
- `provider_reference` nullable text; timestamps.

### `order_items`

- `id` UUID primary key; `order_id` foreign key; optional `product_variant_id` reference.
- Snapshot fields: `product_name`, `variant_name`, `unit_price_ugx`, `quantity`, `line_total_ugx`.

### Optional `payment_events` (recommended for MoMo)

- `id` UUID; `order_id` foreign key; provider; provider reference; event/status; safe metadata; received/created timestamps.
- Restrict writes to trusted server code; avoid storing credentials or unnecessary sensitive payloads.

## 12. Security, privacy, and RLS

- Enable RLS on all customer/private tables.
- Customers may read/update only their own profile fields and read only their own orders and order items, enforced using the authenticated user ID and order ownership.
- Anonymous users may read only active catalogue rows and public product media.
- Clients must not directly set authoritative price, total, payment status, order ownership, or stock changes.
- Use a server-side trusted path for order creation, price lookup, stock validation, Mailgun, and MoMo calls. Keep Supabase service-role keys, Mailgun API key, and MoMo secrets in server-only environment variables.
- Validate and normalize all checkout input; use database constraints and parameterized queries/client libraries.
- Do not collect or store card data, MoMo PINs, or unnecessary identity data.
- Avoid logging access tokens, secrets, full provider payloads, or unnecessary personal data.
- Apply least privilege to storage and database policies. Test policies with anonymous, customer A, and customer B contexts before release.
- Configure OAuth redirect URLs for local, preview, and production environments explicitly.

## 13. Non-functional requirements

- **Responsive:** Usable on current mobile and desktop browsers, with mobile checkout as a first-class layout.
- **Usability:** Clear prices in UGX, selected package, totals, payment state, validation feedback, and order confirmation.
- **Reliability:** Order persistence is independent of email delivery; retries must not create duplicate orders or payment events.
- **Performance:** Common catalogue and order-history views should feel responsive on typical mobile connections; optimize image size and avoid unnecessary requests.
- **Accessibility:** Semantic headings/forms, keyboard-operable controls, visible focus, labels, and adequate contrast for core flows.
- **Maintainability:** Keep provider integrations behind server-side modules/adapters; configuration and seeded catalogue data should be easy to update.
- **Observability:** Provide useful server logs for checkout/email/payment failures without leaking secrets or excess personal data.
- **Localization:** English MVP, UGX prices, Uganda address and phone conventions; future localization is deferred.

## 14. Deployment and configuration

Deploy the application to Vercel. Required configuration will likely include Supabase URL and public anon key, Google OAuth settings, Mailgun domain/API key/from address, site URL/allowed callback URLs, and MTN sandbox credentials only when available. Secret values belong in Vercel server environment variables and must not be exposed through public client variables. Use separate development/preview/production settings and verify OAuth callbacks and email domain setup for the deployed URL.

## 15. Risks and assumptions

| Risk/assumption | Handling |
|---|---|
| MTN sandbox access or credentials may not be ready for class submission | Keep the integration boundary documented and provide a clearly labeled sandbox/demo placeholder; never imply live payment. |
| Production MoMo may require merchant onboarding and approval | Defer production collection until NISSI completes provider requirements. |
| Nationwide delivery rates and timelines are not confirmed | Capture full Uganda address; make fee/timing configurable and disclose confirmation policy before submit. |
| Honeycomb sales unit could be piece or bag | Both confirmed offers are represented: UGX 2,000 per piece and UGX 20,000 per 10-piece bag. |
| Seed stock is not actual inventory data | Use 100 units per variant only as a configurable demo assumption; reconcile before real launch. |
| Product image/content rights or final descriptions may be outstanding | Use approved assets and mark missing content for owner review before public launch. |
| Mailgun domain verification may delay delivery | Keep order creation independent; verify sender/domain and check provider logs during deployment. |
| OAuth redirect configuration is environment-specific | Configure and verify callback URLs for local and deployed environments. |
| Duplicate checkout submissions can create duplicate orders | Add idempotency protection or disable repeat submit while request is pending; enforce unique references. |

## 16. Success criteria

The class MVP is successful when:

1. A visitor can view the complete confirmed catalogue and accurate UGX prices.
2. A customer can register/sign in with email/password and Google, sign out, then sign in again.
3. A customer can build a cart, submit a valid Uganda delivery address, and create a persistent order using Cash on Delivery or the clearly labeled MoMo sandbox/demo path.
4. Order totals are calculated from trusted server-side prices and order details persist in Supabase.
5. A customer can revisit order history after reopening the website, and cannot access another customer's orders.
6. A committed order triggers a Mailgun confirmation attempt without making order creation depend on email success.
7. RLS and secrets are configured safely, and the site is deployed on Vercel.
8. Core flows work on mobile and desktop at the deployed URL.

## 17. Post-MVP roadmap

1. Confirm nationwide delivery zones, fees, delivery expectations, and fulfillment process.
2. Complete MTN business onboarding and replace sandbox placeholder with production collections, verified callbacks, reconciliation, and failure handling.
3. Build an authenticated admin workspace for products, stock, orders, and customer support.
4. Add stock reservation, low-stock alerts, and operational reporting.
5. Add richer order tracking and delivery-provider integrations.
6. Add search/filtering, reviews, wishlists, coupons, abandoned-cart messages, WhatsApp support, and analytics based on customer and business priorities.
7. Improve localization, accessibility, SEO, performance, and automated operational monitoring.

## 18. Implementation handoff notes

- Treat this PRD as the product source of truth for the class MVP; make a separate `BUILD_PLAN.md` before implementation.
- Preserve the confirmed prices exactly. Keep delivery pricing and final content explicitly configurable where unknown.
- Do not implement production payment claims using sandbox behavior.
- Build and verify authentication, RLS, checkout persistence, order history, and email as end-to-end integrations, not as static UI mockups.
- No coding is authorized by this document request; implementation begins only in a later task.
