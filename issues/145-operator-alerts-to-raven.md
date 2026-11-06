# 145 — Send billing operator alerts to a Raven channel, with email as a setting

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/platform/alerts.py`, `central/billing/payments/reconciliation.py` (`_alert_ops`), `central/billing/ingester/erpnext_sync.py` (`_alert_ops`), `central/billing/doctype/billing_settings/`

## Problem

Billing operator alerts go to email first, and to too many people.

- `alerts.operators()` mails every user with the System Manager role. Its docstring says "enabled", but the query does not filter on that, and Administrator is included. On production there are many System Managers, and most of them do not handle billing.
- Email is a poor place for a page. Several people get the same digest, nobody knows who is acting on it, and it sits next to everything else in the inbox.
- Two alert paths email nobody: reconciliation's `_alert_ops` and the ERPNext sync's `_alert_ops` only write an Error Log row and an invoice comment.

The team already works in Raven, so a billing channel there is where an operator sees an alert first.

## What we want

One place that sends every billing operator alert. A setting decides where it goes: a Raven channel, an email list, or both. Raven is the default. Email goes to a short, named list, not to a role.

## Decisions

| # | Decision |
|---|---|
| 1 | **One sender.** Every operator-facing billing alert goes through one function in `platform/alerts.py`, for example `page(kind, subject, detail, team=None)`. No other billing code emails operators. |
| 2 | **The channel is a setting.** Billing Settings gets an Operator Alerts section: `operator_alert_channel` (Raven, Email, Raven and Email; default Raven). |
| 3 | **Raven settings.** The Raven site URL, the channel id, and a bot user's API key and secret (Password fields). The message is posted as that bot user. Confirm the exact Raven API (`raven.api.raven_message.send_message` or its current name) against frappe/raven before building. |
| 4 | **Email goes to a named list.** An `operator_alert_emails` field (or a User Group). Never every System Manager. If the list is empty and the channel needs email, the setting refuses to save. |
| 5 | **Fallback.** If posting to Raven fails, the alert goes to the email list once, and the failure is logged. An alert is never dropped. |
| 6 | **No change for customers.** Team notifications (payment failed, invoice overdue, and so on) stay on the existing notification engine and its email. This issue covers operator alerts only. |

## TODO

- [ ] Add the Operator Alerts section to Billing Settings, with the fields from decisions 2 to 4 and a "Send test alert" button.
- [ ] Add `platform/alerts.page(...)`. It formats one message: kind, reference (with the team), detail, and a Desk link to the record.
- [ ] Route the hourly digest (`run_operator_alerts`) through it. Keep the digest dedupe and the repeat window.
- [ ] Route reconciliation's and the ERPNext sync's `_alert_ops` through it, and the new alerts from issues 131 (failed webhooks, late captures), 132 (failed refunds) and 134 (disputes).
- [ ] Remove `operators()` and its "every System Manager" query.
- [ ] Escape gateway error text in the Raven message as the email template does today.
- [ ] Document the settings in the billing ARCHITECTURE notes (operator alerts section).

## Acceptance criteria

- [ ] With the channel set to Raven, an alert posts one message to the configured channel and sends no email.
- [ ] With Raven down, the same alert reaches the email list once.
- [ ] No billing code sends mail to the System Manager role.
- [ ] Tests cover each channel setting, the fallback, and the digest dedupe.

## Source

Requested by Saurabh on 23 Oct 2026: too many System Managers get billing email, and admin alerts should reach a Raven channel first.

## Blocked by

—
