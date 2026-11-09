# Outbound call sites

Snapshot central `a95b491e` (9 Nov 2026). Generated from the code by an AST script (read-only); every row is a source reference. Paths start at the central repo root.

Every call in billing (excluding tests and demo) that matched a pattern for an outbound client call: `requests.*`, `stripe.<Object>.<method>`, Razorpay `client.<resource>.<method>`, and the ERPNext wrapper `connection.<verb>`. The Timeout column says whether a `timeout=` keyword is passed **at that call**. A wrapper may set it inside (for example `central/billing/ingester/connection.py` sets it on every `requests` call, so `connection.*` callers inherit it).

| File | Calls | Distinct call shapes | Calls with `timeout=` at the call |
|---|---|---|---|
| `central/billing/gateways/paypal_adapter.py` | 12 | `requests.get`, `requests.post` | 12 |
| `central/billing/gateways/razorpay_adapter.py` | 24 | `client.order.create`, `client.order.payments`, `client.payment.createRecurring`, `client.payment.fetch`, `client.payment.refund`, `self._client().customer.create`, `self._client().customer.edit`, `self._client().invoice.fetch`, `self._client().order.create`, `self._client().payment.all`, `self._client().payment.fetch`, `self._client().payment_link.create`, `self._client().payment_link.fetch`, `self._client().refund.fetch`, `self._client().token.cancel`, `self._client().token.fetch`, `self._client().utility.verify_payment_signature`, `self._client().utility.verify_webhook_signature`, `self._client().webhook.create`, `self._client().webhook.edit`, `self._client().webhook.fetch` | 0 |
| `central/billing/gateways/stripe_adapter.py` | 19 | `stripe.Account.retrieve`, `stripe.Customer.create`, `stripe.Mandate.retrieve`, `stripe.PaymentIntent.cancel`, `stripe.PaymentIntent.create`, `stripe.PaymentIntent.retrieve`, `stripe.PaymentMethod.retrieve`, `stripe.Refund.create`, `stripe.Refund.retrieve`, `stripe.SetupIntent.create`, `stripe.SetupIntent.retrieve`, `stripe.Webhook.construct_event`, `stripe.WebhookEndpoint.create`, `stripe.WebhookEndpoint.modify`, `stripe.WebhookEndpoint.retrieve` | 0 |
| `central/billing/ingester/advance.py` | 1 | `connection.post` | 0 |
| `central/billing/ingester/connection.py` | 5 | `requests.get`, `requests.request` | 5 |
| `central/billing/ingester/erpnext_sync.py` | 6 | `connection.fetch`, `connection.post` | 0 |
| `central/billing/ingester/gst.py` | 2 | `connection.fetch` | 0 |
| `central/billing/ingester/setup.py` | 2 | `connection.call`, `connection.fetch` | 0 |
| `central/billing/payments/corrections.py` | 8 | `connection.fetch`, `connection.post` | 0 |
| `central/billing/platform/alerts.py` | 1 | `requests.post` | 1 |

## Line list

| Location | Call | `timeout=` |
|---|---|---|
| `central/billing/gateways/paypal_adapter.py:297` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:327` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:339` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:348` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:365` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:377` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:400` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:409` | `requests.post` | yes |
| `central/billing/gateways/paypal_adapter.py:418` | `requests.get` | yes |
| `central/billing/gateways/paypal_adapter.py:424` | `requests.get` | yes |
| `central/billing/gateways/paypal_adapter.py:430` | `requests.get` | yes |
| `central/billing/gateways/paypal_adapter.py:437` | `requests.post` | yes |
| `central/billing/gateways/razorpay_adapter.py:70` | `self._client().payment.all` |  |
| `central/billing/gateways/razorpay_adapter.py:83` | `self._client().webhook.create` |  |
| `central/billing/gateways/razorpay_adapter.py:99` | `self._client().webhook.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:112` | `self._client().webhook.edit` |  |
| `central/billing/gateways/razorpay_adapter.py:125` | `client.order.create` |  |
| `central/billing/gateways/razorpay_adapter.py:156` | `self._client().order.create` |  |
| `central/billing/gateways/razorpay_adapter.py:189` | `client.payment.createRecurring` |  |
| `central/billing/gateways/razorpay_adapter.py:193` | `client.payment.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:214` | `client.payment.refund` |  |
| `central/billing/gateways/razorpay_adapter.py:224` | `self._client().refund.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:258` | `self._client().utility.verify_webhook_signature` |  |
| `central/billing/gateways/razorpay_adapter.py:285` | `self._client().payment.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:290` | `self._client().payment.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:294` | `self._client().payment.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:334` | `self._client().order.create` |  |
| `central/billing/gateways/razorpay_adapter.py:365` | `self._client().payment_link.create` |  |
| `central/billing/gateways/razorpay_adapter.py:385` | `self._client().payment_link.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:390` | `self._client().customer.create` |  |
| `central/billing/gateways/razorpay_adapter.py:405` | `self._client().customer.edit` |  |
| `central/billing/gateways/razorpay_adapter.py:410` | `self._client().utility.verify_payment_signature` |  |
| `central/billing/gateways/razorpay_adapter.py:417` | `self._client().token.cancel` |  |
| `central/billing/gateways/razorpay_adapter.py:421` | `self._client().invoice.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:439` | `self._client().token.fetch` |  |
| `central/billing/gateways/razorpay_adapter.py:461` | `client.order.payments` |  |
| `central/billing/gateways/stripe_adapter.py:193` | `stripe.Account.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:208` | `stripe.WebhookEndpoint.create` |  |
| `central/billing/gateways/stripe_adapter.py:221` | `stripe.WebhookEndpoint.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:235` | `stripe.WebhookEndpoint.modify` |  |
| `central/billing/gateways/stripe_adapter.py:259` | `stripe.SetupIntent.create` |  |
| `central/billing/gateways/stripe_adapter.py:336` | `stripe.PaymentIntent.create` |  |
| `central/billing/gateways/stripe_adapter.py:358` | `stripe.PaymentIntent.create` |  |
| `central/billing/gateways/stripe_adapter.py:385` | `stripe.Refund.create` |  |
| `central/billing/gateways/stripe_adapter.py:408` | `stripe.Refund.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:437` | `stripe.Webhook.construct_event` |  |
| `central/billing/gateways/stripe_adapter.py:461` | `stripe.PaymentIntent.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:487` | `stripe.PaymentIntent.create` |  |
| `central/billing/gateways/stripe_adapter.py:529` | `stripe.PaymentIntent.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:614` | `stripe.SetupIntent.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:619` | `stripe.PaymentMethod.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:636` | `stripe.Customer.create` |  |
| `central/billing/gateways/stripe_adapter.py:646` | `stripe.Mandate.retrieve` |  |
| `central/billing/gateways/stripe_adapter.py:670` | `stripe.PaymentIntent.cancel` |  |
| `central/billing/gateways/stripe_adapter.py:677` | `stripe.Refund.create` |  |
| `central/billing/ingester/advance.py:54` | `connection.post` |  |
| `central/billing/ingester/connection.py:47` | `requests.get` | yes |
| `central/billing/ingester/connection.py:58` | `requests.get` | yes |
| `central/billing/ingester/connection.py:86` | `requests.get` | yes |
| `central/billing/ingester/connection.py:109` | `requests.get` | yes |
| `central/billing/ingester/connection.py:118` | `requests.request` | yes |
| `central/billing/ingester/erpnext_sync.py:155` | `connection.post` |  |
| `central/billing/ingester/erpnext_sync.py:270` | `connection.fetch` |  |
| `central/billing/ingester/erpnext_sync.py:321` | `connection.fetch` |  |
| `central/billing/ingester/erpnext_sync.py:352` | `connection.post` |  |
| `central/billing/ingester/erpnext_sync.py:366` | `connection.fetch` |  |
| `central/billing/ingester/erpnext_sync.py:387` | `connection.post` |  |
| `central/billing/ingester/gst.py:56` | `connection.fetch` |  |
| `central/billing/ingester/gst.py:86` | `connection.fetch` |  |
| `central/billing/ingester/setup.py:200` | `connection.fetch` |  |
| `central/billing/ingester/setup.py:205` | `connection.call` |  |
| `central/billing/payments/corrections.py:394` | `connection.post` |  |
| `central/billing/payments/corrections.py:408` | `connection.post` |  |
| `central/billing/payments/corrections.py:429` | `connection.fetch` |  |
| `central/billing/payments/corrections.py:486` | `connection.post` |  |
| `central/billing/payments/corrections.py:508` | `connection.fetch` |  |
| `central/billing/payments/corrections.py:541` | `connection.post` |  |
| `central/billing/payments/corrections.py:563` | `connection.post` |  |
| `central/billing/payments/corrections.py:582` | `connection.post` |  |
| `central/billing/platform/alerts.py:350` | `requests.post` | yes |
