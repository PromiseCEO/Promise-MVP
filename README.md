# Promise — Expo + Supabase + Stripe

A cross-platform (iOS, Android, web) rebuild of the Promise MVP using:
- **Expo Router** (React Native) for the app itself
- **Supabase** for auth, Postgres database, storage, and edge functions
- **Stripe Checkout** for real subscription billing

## 1. Install the app dependencies

```bash
npm install
```

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. In **SQL Editor**, paste and run `supabase/schema.sql` from this repo.
   This creates every table, row-level security policy, the
   auto-create-profile trigger, and two Storage buckets
   (`wall-photos`, `profile-photos`).
3. In **Project Settings → API**, copy your **Project URL** and
   **anon public key**.
4. Copy `.env.example` to `.env` and paste those two values in as
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Create your Stripe products

1. In the [Stripe Dashboard](https://dashboard.stripe.com) → Product catalog,
   create three **recurring** prices:
   - "Singles Journey" — $15/month
   - "Couples Journey" — $25/month
   - "Family Promise Journey Add-on" — $10/month
2. Copy each price's ID (starts with `price_...`) — you'll need them in step 5.

## 4. Install the Supabase CLI and link your project

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

## 5. Set Edge Function secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_or_test_...
supabase secrets set STRIPE_PRICE_SINGLES=price_...
supabase secrets set STRIPE_PRICE_COUPLES=price_...
supabase secrets set STRIPE_PRICE_FAMILY_ADDON=price_...
supabase secrets set APP_SCHEME=promiseapp
# STRIPE_WEBHOOK_SECRET is set in step 7, after Stripe gives you one
```

## 6. Deploy the Edge Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` is required for the webhook because Stripe calls it
directly — it isn't a logged-in app user.

## 7. Point Stripe's webhook at Supabase

1. In Stripe Dashboard → Developers → Webhooks → **Add endpoint**.
2. Endpoint URL: `https://YOUR-PROJECT-REF.functions.supabase.co/stripe-webhook`
3. Events to send: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Copy the **Signing secret** Stripe gives you and run:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 8. Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone (iOS/Android), or press
`w` to open the web version. Deep linking (`promiseapp://checkout-return`)
works automatically in Expo Go for testing; for a production build it will
use your app's custom scheme once installed on-device.

## 9. Test a subscription end-to-end

1. Sign up, build your profile, create your Self Promise.
2. Go to **Plan**, choose a membership, tap **Continue to Stripe Checkout**.
3. Use Stripe's test card `4242 4242 4242 4242`, any future expiry/CVC.
4. After payment, Stripe redirects to `promiseapp://checkout-return`, the
   app refreshes, and your `profiles.subscription_status` becomes `active`
   (driven by the webhook, not the client — so it can't be spoofed).

## Project structure

```
app/
  _layout.tsx              root layout — auth gate, redirects signed-out
                            users to (auth), signed-in users to (app)
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (app)/
    _layout.tsx             bottom tab navigator
    index.tsx                home / journey selection
    profile.tsx               intentional profile builder
    self-promise.tsx          Date Yourself First + Self Promise
    plan.tsx                  membership selection + Stripe Checkout
    checkout-return.tsx       deep-link landing screen after Stripe
    family/
      index.tsx                family members list
      add.tsx                   add/edit a member + Individual Promise
      household.tsx             Household Promise
    wall.tsx                  Promise Wall (photos + framed promises)
    goals.tsx                  Couples Goals Wall (public feed)
lib/
  supabase.ts               Supabase client (AsyncStorage session)
  stripe.ts                 starts Stripe Checkout, opens in-app browser
  AuthProvider.tsx          session + profile context
  theme.ts, ui.tsx          shared styling/components
supabase/
  schema.sql                tables, RLS policies, storage buckets
  functions/
    create-checkout-session/  creates a Stripe Checkout Session
    stripe-webhook/            verifies + applies Stripe events
```

## What's fully wired vs. what to add next

**Fully wired to Supabase + Stripe:** sign up/sign in, intentional
profile, Self Promise, plan selection + real Stripe subscription
checkout + webhook-driven activation, Family Journey (members,
Individual Promises, Household Promise), Promise Wall (with real photo
uploads to Supabase Storage), Couples Goals Wall (public feed + posting +
celebrating).

**Not yet built (same data patterns apply — copy an existing screen):**
- Singles matching / slideshow (`singles` demo list, `interested` signal)
- Couples Journey: individual Self Promises per partner, Realignment,
  and progress-check screens (tables `couple_self_promises` and
  `realignment_answers` already exist in the schema for this)
- In-app messaging UI (the `messages` table and RLS policy already exist;
  add a chat screen with Supabase Realtime subscriptions for live updates)
- Public Meet QR code screen

Each of these already has its table + RLS policy in `schema.sql` — follow
the pattern in `app/(app)/self-promise.tsx` or `family/add.tsx` (load with
`supabase.from(...).select()`, save with `.upsert()`/`.insert()`) to add
the screen.

## Shipping to the App Store / Play Store

Once you're ready to go past Expo Go testing, use
[EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

You'll need an Apple Developer account ($99/yr) and a Google Play
Developer account ($25 one-time) to publish to each store.
