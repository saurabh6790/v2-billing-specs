# Accessibility gaps in payment-method and invoice screens

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-17](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:billing-setup`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
Selections, reasons and errors in D1/D2 screens are not exposed to assistive technology.

## Current behaviour
- See `03-ui-ux/accessibility-review.md` A-01 to A-09 (role-less group label, colour-only selection, title-only reasons, `role="alert"` on a persistent banner, unlinked email error, side panel focus).

## Expected outcome
Each item meets the listed WCAG 2.2 criterion when tested with a screen reader and keyboard.

## Affected users
Customers using assistive technology.

## Evidence
See the current behaviour above; full detail in [CB-17](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Tasks that cannot be completed without sight or a mouse.

## Solution options
- A. Fix A-01 to A-09 as listed.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A, then test (D-09).

## Acceptance criteria
- [ ] Each A-item fixed as listed.
- [ ] Keyboard-only run of add method and pay invoice passes.
- [ ] VoiceOver announces selected tiles and errors.

## Dependencies
D-09 for testing. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
