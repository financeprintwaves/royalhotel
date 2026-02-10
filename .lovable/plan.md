

## Fix: Portion Selection Dialog Not Showing for RHBR Items

### Root Cause

The `portion_options` column in the database stores values as **double-encoded JSON strings** rather than proper JSON arrays. When Supabase returns the data:

- Expected: `[{name: "Single", price: 0.99}, ...]` (a JavaScript array)
- Actual: `"[{\"name\":\"Single\",\"price\":0.99}, ...]"` (a string containing JSON)

So `Array.isArray(item.portion_options)` returns `false`, and the portion dialog never opens. The item gets added directly to cart instead.

This affects ALL items with portions (Chicken Biryani Regular, Mutton Biryani, Fruit Salad, etc.) across all branches.

### Fix

Update the portion parsing logic in two files to handle both formats (string and array):

**File: `src/pages/POS.tsx`** (line ~244)

Change:
```typescript
const portions = Array.isArray(item.portion_options) ? item.portion_options : [];
```

To:
```typescript
let portions: PortionOption[] = [];
if (Array.isArray(item.portion_options)) {
  portions = item.portion_options;
} else if (typeof item.portion_options === 'string') {
  try { portions = JSON.parse(item.portion_options); } catch {}
}
```

**File: `src/components/PortionSelectionDialog.tsx`** (line ~24)

Same fix for the `portionOptions` variable:
```typescript
let portionOptions: PortionOption[] = [];
if (Array.isArray(item.portion_options)) {
  portionOptions = item.portion_options;
} else if (typeof item.portion_options === 'string') {
  try { portionOptions = JSON.parse(item.portion_options); } catch {}
}
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/POS.tsx` | Parse string-encoded portion_options in `handleMenuItemClick` |
| `src/components/PortionSelectionDialog.tsx` | Parse string-encoded portion_options in dialog component |

### Why This Happens

When portion options were saved via the Menu Management UI, they were likely stored using `JSON.stringify()` into a JSONB column, which double-encodes the value as a string instead of a native JSON array.

