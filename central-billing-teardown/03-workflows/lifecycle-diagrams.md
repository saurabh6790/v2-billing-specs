# Lifecycle diagrams

State machines are copied from `central/billing/states.py:39-158` at `a95b491e`. Every
status change goes through `states.transition()`, which refuses a move the machine
does not list and writes a `Billing Event`.

## Subscription

A Subscription has no lifecycle status field. Its life is three separate things:
`enabled` (pause/resume), `account_standing` (dunning), and the server's own status
read from Atlas.

```mermaid
stateDiagram-v2
  direction LR
  state "Enabled (billing)" as E {
    [*] --> Active
    Active --> Paused: pause_billing (stops server)
    Paused --> Active: resume_billing (starts server)
  }
  state "account_standing (team, copied per row)" as S {
    [*] --> Current
    Current --> PastDue: dunning
    PastDue --> Current: paid
    PastDue --> Suspended: suspension day (servers stop)
    Suspended --> Current: paid (restore_after_payment starts them)
  }
```

`Subscription Change` records each step as `change_type`: Created, Plan Changed,
Payment Method Changed, Paused, Resumed, Past Due, Suspended, Reactivated, Cancelled.

## Invoice

```mermaid
stateDiagram-v2
  [*] --> Outstanding: drafted (no due date)
  Outstanding --> Outstanding: opened (payment and due dates set) / held (hold_reason)
  Outstanding --> Paid: credits cover / capture
  Outstanding --> Overdue: last retry day
  Outstanding --> Cancelled: operator cancel (no money taken)
  Outstanding --> Waived: internal team
  Overdue --> Paid
  Overdue --> Cancelled
  Overdue --> Waived
  Paid --> Cancelled: cancel and refund (credit note)
  Cancelled --> [*]
  Waived --> [*]
```

"Outstanding" covers three customer situations: drafted and not issued, held for
billing details, and issued and owed. The console separates them with `is_issued`
(`dashboard/src/components/billing/OutstandingAlert.vue:28-29`), but the badge on the
invoice list says "Outstanding" for all three.

## Payment Attempt

```mermaid
stateDiagram-v2
  [*] --> Initiated: claimed under invoice lock
  Initiated --> Authorised
  Initiated --> Captured: webhook
  Initiated --> Failed: decline / order not created / timed out by reconciliation
  Authorised --> Captured
  Authorised --> Failed
  Captured --> Refunded: full refund / late capture
  Captured --> Failed: reversal
  Failed --> [*]
  Refunded --> [*]
```

A partial refund leaves the attempt Captured. Only a full or late-capture refund
moves it to Refunded.

## Payment (end to end, customer view)

```mermaid
flowchart LR
  A[Invoice opens] --> B{Wallet covers?}
  B -- yes --> P[Paid]
  B -- no --> C{Collection mode}
  C -- Auto Charge --> D[Payment date: charge method 1]
  C -- Manual Checkout --> M[Customer pays from Invoices]
  C -- Prepaid --> D
  D --> E{Webhook}
  E -- captured --> P
  E -- failed --> F[Next method, then single retry after 24 h]
  F --> G{Paid?}
  G -- yes --> P
  G -- no --> H[Dunning retries → Overdue → Suspended]
  M --> P
  H --> M
```

Prepaid is drawn into the same charge path as Auto Charge on purpose: the backend
debits a Prepaid team's saved method once credit runs out
(`central/billing/payments/collection_mode.py:105-112` `is_debit_allowed`; dunning
retries Prepaid too, `revenue/dunning.py:331-334`). Only Manual Checkout and Action
Required hold the debit back. The console describes Prepaid differently (F-23).

## Refund

```mermaid
stateDiagram-v2
  [*] --> Initiated
  Initiated --> Pending: gateway accepted, not paid out
  Initiated --> Completed
  Initiated --> Failed
  Pending --> Completed
  Pending --> Failed
  Failed --> Initiated: operator retries
  Completed --> [*]
```

## Payment Method

```mermaid
stateDiagram-v2
  [*] --> PendingValidation
  PendingValidation --> Active
  PendingValidation --> Failed
  PendingValidation --> Cancelled
  Active --> Paused
  Active --> Cancelled
  Active --> Expired: monthly expire_payment_methods
  Active --> Failed
  Paused --> Active
  Paused --> Cancelled
  Paused --> Expired
```

Failed, Cancelled and Expired are terminal: a card the network renews cannot come
back to Active (issue 129).

## Top-up Order and Webhook Event

```mermaid
stateDiagram-v2
  state TopUp {
    [*] --> Created
    Created --> Credited
    Created --> Failed
    Created --> Expired
    Expired --> Credited: paid late, found by reconciliation
  }
  state Webhook {
    [*] --> Received
    Received --> Processed
    Received --> Failed
    Received --> Ignored: no stored row / not ours
    Failed --> Processed: hourly retry
    Failed --> Ignored
  }
```

## Integration data flow

```mermaid
flowchart LR
  GR[Grove / Cargo] -- usage totals --> UR[(Usage Rollup)]
  AT[Atlas] -- VM status --> SUB[(Subscription + Change)]
  SUB --> GEN[Invoice generator]
  UR --> GEN
  GEN --> INV[(Invoice)]
  INV -- charge --> GW[Stripe / Razorpay / PayPal]
  GW -- signed webhook --> WE[(Webhook Event)] --> INV
  INV -- Sales Invoice, Payment Entry --> ERP[ERPNext]
  TU[(Top-up Order)] -- advance --> ERP
  ERP -- GST status --> BP[(Billing Profile)]
  INV -- alerts --> RV[Raven / email]
  INV -- payment notices --> EM[Customer email + in-app]
```
