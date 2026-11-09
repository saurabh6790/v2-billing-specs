# 188 — Object storage is metered but priced at zero, and its GiB figure is labelled GB

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:metering`
**Area:** central/billing/revenue/storage_usage.py, Catalog Rate (Storage), Object Storage Plan
**Source:** [CB-47](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-23, GB (10⁹). D-22, any included amount comes from the plan's base offering.
>
> **HITL:** needs a Storage price from finance.

## Problem

Storage usage is recorded every day and billed at ₹0, and the quantity is in GiB while the line says GB.

## Current behaviour

- Production: the Object Storage Plan includes Storage 0 GB; no Catalog Rate exists for Storage; the 4 usage rollups carry locked rate 0.
- BYTES_PER_GIB = 1024**3 with the comment “Cargo counts and caps buckets in GiB; billing names the unit GB” (storage_usage.py:13-14): 7.4 % fewer units than GB.
- All 6 storage services in production are internal teams, so no customer has been affected.

## What we want

Storage has a price per GB-month per currency (and the included amount of the plan's base offering, D-22), and the unit on the invoice is what was measured.

**Who it affects:** Storage customers; finance.

**Why it matters:** Revenue of zero for a service with real cost; a unit mismatch that a customer comparing with their own S3 tooling will notice.

## Options

- A. Price per GB (10⁹) and convert bytes with 10⁹.
- B. Price per GiB and label it GiB.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A (D-23 decided).

## Acceptance criteria

- [ ] A Storage Catalog Rate exists for INR and USD before any external team stores data.
- [ ] Bytes convert to the billed unit with one constant, and the label matches it.
- [ ] Existing rollups (internal, rate 0) are left as they are.

## Dependencies

#187. Price from finance.
