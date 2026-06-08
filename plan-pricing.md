# Plan & Pricing Summary

## 1. Core Philosophy

We follow a **hybrid pricing model**:

- **Predictable pricing for core resources (VMs)**
- **Usage-based pricing for variable resources (snapshots, future add-ons)**

> Goal: Simple for users, precise internally

---

## 2. Plan Structure

A **Plan** is a composition of:

- Resources (vCPU, Memory, Disk)
- Pricing model
- Billing rules
- Version (immutable)

---

## 3. VM Pricing (Bundle-Based)

VMs are sold as **fixed bundles**.

### Example

- 1/8 vCPU
- 256 MB RAM
- 10 GB Disk

Pricing:
- ₹X per hour
- ₹Y estimated per month

### Key Behavior

- Charged **when VM is running or in stopped state**
- When terminated → no compute charges provision only to charge disk required for snapshot

---

## 4. Resource Modeling

### Fractional CPU

- 1 vCPU = 1000 millicores  
- Supports: 0.125, 0.25, 0.5, 1, 2...

---

### Memory via Ratio

Memory is derived from CPU:

- Standard: **1:2 (vCPU:RAM)**
- High-memory: **1:4**

Example:
0.125 vCPU × 2 = 0.25 GB (256 MB)


---

## 5. Disk Pricing

- Included in VM bundle (base disk)
- Charged **even when VM is stopped**

---

## 6. Snapshot Pricing (Usage-Based)

Snapshots are billed separately:
cost = GB × price_per_GB_per_day × duration


- Independent of VM lifecycle
- Continues after VM deletion

---

## 7. Billing Model

Billing is derived from events:
Events → Time Intervals → Usage → Pricing

### States

- Running → compute + disk
- Stopped → disk only
- Terminated → no compute
- Snapshot → storage billing

---

## 8. Plan Configurator Logic

Plans are created via:

1. Select ratio (1:2 or 1:4)
2. Select vCPU
3. Auto-calculate memory
4. Add disk size
5. Define price per hour
6. Configure billing rules

---

## 9. Pricing Types

| Type | Usage |
|------|------|
| Fixed | VM bundles |
| Metered | Snapshots |
| (Future) Tiered | APIs, SaaS |

---

## 10. Versioning

- Plans are **immutable**
- Changes create new versions

Example:
- micro-vm v1
- micro-vm v2

---

## 11. User Experience

User always sees:

- Clear hourly price
- Monthly estimate
- Transparent snapshot rates

---

## Final Model

### User View
- Simple plans with predictable cost

### System View
- Event-driven usage calculation with flexible pricing