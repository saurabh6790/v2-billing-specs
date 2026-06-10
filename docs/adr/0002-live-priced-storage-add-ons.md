# Depreciating storage add-ons are live-priced, not grandfathered

Bundles and most add-ons lock their rate at provision (the **price-lock**) to protect customers
from increases. Snapshots are long-lived storage whose rates trend **down** over time, so uniform
grandfathering would strand a customer on a stale-high rate. We make **snapshot** a **live-priced
add-on**: its rate is read from the current **Catalog Rate** each billing period rather than
locked at provision. The snapshot is its own `resource_id` from birth — independent of the VM, so
it survives termination and is owned by the team — with **no free allowance**, giving
`bill = GB-days × live_rate`. "Live-priced" is a per-add-on-type property; snapshot is the first
member, and future depreciating-storage add-ons (e.g. extra block storage) can opt in.

## Consequences

- `metering.md`'s "rate + allowance locked at provision" holds only for **grandfathered** add-ons.
  Live-priced add-ons are an explicit carve-out — reconcile the wording when that doc is next
  touched.
- The **Add-on** DocType needs a pricing-mode flag (`grandfathered` / `live`) so billing knows
  whether to read the locked rate or the current Catalog Rate.
- A snapshot taken before a price drop bills *less* next period — the opposite of grandfathering,
  and intended.
