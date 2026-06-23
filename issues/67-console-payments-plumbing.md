# 67 — Console payments plumbing (Stripe/Razorpay composables)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Stand up the gateway/payment plumbing in `console/` — the only **net-new**
(non-port) work in the migration, and the dependency for the Overview wallet /
payment-methods and Onboarding. Port the legacy composables to TypeScript.

- Add `@stripe/stripe-js` to `console/package.json`.
- Port `useAddStripeCard`, `useAddPaymentMethod` (Razorpay), `useTopup`,
  `usePayInvoice`, `usePayInvoiceCheckout`, `useBillingSetup` from
  `dashboard/src/composables/*.js` → typed `.ts` under `console/src/composables/`.
- Keep the existing flow (#08/#28/#29/#60): `initiate_card_setup` → Stripe
  SetupIntent + Elements mount → `confirm_card`; Razorpay order + checkout; topup
  order → confirm. Publishable key + client secret come from the backend.

## Acceptance criteria

- [ ] Stripe Elements card field mounts in console and a SetupIntent confirms end-to-end against the real (test-mode) endpoints.
- [ ] Razorpay add-method + topup checkout paths work via the existing endpoints.
- [ ] All ported composables are typed; `vue-tsc` passes; no publishable key hardcoded.
- [ ] Toasts/errors routed through `lib/toast.ts`.

## Blocked by

- #66

## Notes

- Highest-risk slice — validate the SetupIntent + Elements mount path first.
- Mirrors the legacy Stripe/Razorpay split; no endpoint changes.
