

## Fix FOC Payment Failing Due to Database Constraint

### Problem
The `payments` table has a CHECK constraint (`payments_amount_check`) that requires `amount > 0`. When FOC processes a zero-amount payment via `quick_pay_order`, the database rejects it.

### Solution

**1. Database Migration** -- Alter the CHECK constraint to allow amount >= 0 instead of amount > 0.

```sql
ALTER TABLE public.payments DROP CONSTRAINT payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);
```

**2. Update `quick_pay_order` RPC** -- The function currently validates `p_amount < v_order.total_amount`. For FOC orders where `total_amount = 0`, a payment of 0 should be valid. This check already passes (0 is not less than 0), so no RPC change is needed.

### Files Changed
| Change | Detail |
|--------|--------|
| Database migration | Relax `payments_amount_check` from `> 0` to `>= 0` |

No code file changes needed -- this is purely a database constraint fix.

