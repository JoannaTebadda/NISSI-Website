# NISSI Mobile MVP

Expo React Native companion app for the NISSI storefront. It uses the existing Supabase project, catalogue prices, and customer accounts. Signed-in customers have one database-backed cart shared between the website and app, with Supabase Realtime updates.

## First-time setup

1. Install **Expo Go** on the Android or iPhone you will use for the class demo.
2. In this folder, create a `.env` file by copying `.env.example`.
3. In `.env`, enter the same Supabase project URL and **publishable** key used by the website, and the website URL shown in the example. The app must use the `EXPO_PUBLIC_` names shown in the example. Never put a Supabase secret/service-role key in this file.
4. In the Supabase Dashboard, open **SQL Editor**, paste the contents of `../supabase/cart_sync.sql`, and run it. This creates the customer cart tables, ownership policies, and Realtime publication.
5. In Supabase **Authentication → URL Configuration**, add `exp://**/--/auth/callback` to the allowed redirect URLs for changing local Expo Go network addresses. For a native app build, add `nissi://auth/callback`.
6. In Supabase **Authentication → Providers → Google**, keep Google enabled. Use the same Google provider configuration already used by the website.
7. From this folder, run `npm install`, then `npm start`. Keep the computer and phone on the same Wi-Fi and scan the QR code with Expo Go.

## Class MVP behavior

- Sign in with the same NISSI email/password or Google account used on the website.
- Browse the six catalogue products and choose product sizes.
- Add, remove, and change quantities in the signed-in customer's shared cart.
- Website and mobile cart changes are sent to Supabase and appear on the other signed-in client through Realtime.
- Checkout collects Uganda delivery details in the app and submits orders to the website's secure checkout API. The same Cash on Delivery and MTN MoMo sandbox choices are available; the sandbox does not make a real payment request.
- The server validates the signed-in user's Supabase access token before creating an order. The website's `SUPABASE_SECRET_KEY` remains server-only.

If the app says cart setup is needed, verify that `cart_sync.sql` ran successfully and Realtime is enabled for `public.cart_items` in Supabase.
