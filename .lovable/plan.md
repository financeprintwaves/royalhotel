

## Fix Build Errors and Optimize Print Flow

### 1. Fix TypeScript Build Errors in ReceiptDialog.tsx

The Supabase client's `.maybeSingle().then()` returns a `PromiseLike` which doesn't have `.catch()`. Fix by wrapping the Supabase calls in proper `Promise` wrappers or using try/catch within `.then()`.

**File**: `src/components/ReceiptDialog.tsx`
- Lines 75-87: Wrap the waiter profile fetch so `.catch()` is on a real `Promise`
- Lines 92-103: Same fix for branch info fetch

### 2. No Other Code Changes Needed

The payment flow is already optimized:
- `quickPayOrder` single-RPC is already in place (1 network call instead of 4)
- Receipt is already built from local state (zero extra DB calls)
- `ReceiptDialog` already attempts local printer first, falls back to browser print
- `printService.ts` already sends HTML to `localhost:3001/print` for silent printing

The "invoice before pay" and "skip print dialog" features require a local print daemon running on the POS terminal (already integrated via `printService.ts`). The browser cannot silently print without user interaction due to security restrictions -- the existing architecture correctly handles this by trying the local daemon first.

### Technical Details

The only actual code change is fixing the TS errors on lines 84 and 101 of `ReceiptDialog.tsx`. The `.then()` on Supabase's `PostgrestFilterBuilder` returns `PromiseLike<void>`, not `Promise<void>`, so `.catch()` is unavailable. Fix: wrap each call in `Promise.resolve(...)` to convert to a full `Promise`.

### Files Changed

| File | Action |
|------|--------|
| `src/components/ReceiptDialog.tsx` | Fix 2 TypeScript errors (wrap Supabase calls in Promise.resolve) |

