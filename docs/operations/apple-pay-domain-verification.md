# Apple Pay Domain Verification

Apple Pay buttons silently fail to render unless the domain is verified with Apple via Stripe. This must be done once per domain (production, every preview/staging domain).

## Steps

1. Log into the Stripe Dashboard → Settings → Payment methods → Apple Pay.
2. Click "Add a new domain".
3. Enter the domain (e.g. `inkstash.app`, `staging.inkstash.app`).
4. Stripe gives you a verification file. Download it.
5. Host the file at `https://<domain>/.well-known/apple-developer-merchantid-domain-association` — exact path, no extension.
6. Click "Verify" in the Stripe Dashboard.
7. Test by loading the Ruby bundle modal on Safari (iOS or macOS) with at least one card in Apple Wallet. Apple Pay button must render.

## When this is required

- Before any Phase 5 deploy reaches production.
- Whenever a new staging/preview domain is provisioned and we want Apple Pay testable there.

## CLI alternative (Stripe CLI)

```bash
stripe apple_pay domains create --domain-name inkstash.app
```

Hosting the verification file is still required — the CLI command just creates the Stripe record.

---

# PayPal enablement (Stripe Payment Element)

PayPal is a Stripe Payment Element payment method, no separate SDK needed. Enable it once in the Stripe Dashboard:

1. Stripe Dashboard → Settings → Payment methods → PayPal → "Turn on".
2. Accept Stripe's PayPal terms.
3. Done. The `automatic_payment_methods: { enabled: true }` setting on every PaymentIntent now surfaces PayPal as an option alongside card/Apple Pay/Google Pay.

## PayPal limitations

- PayPal does NOT support Stripe Connect destination charges with `application_fee_amount` in all modes. Vendor pack PaymentIntents (which use destination charges) will automatically filter PayPal out and surface card + Apple Pay + Google Pay only. This is Stripe's behavior, not a bug — there's nothing to code for.
- PayPal does support direct charges (Ruby bundle purchases) without restriction.

# Resend email confirmations

USD transactions in Phase 5 (Ruby bundles + vendor packs) trigger a confirmation email via Resend. Existing functions in `supabase/functions/send-*` follow the same pattern; the new ones (Task A6, Task C11) follow that same shape.

The Resend API key is already configured: `VITE_RESEND_API_KEY` secret on the Supabase Functions environment. No new secret to provision.
