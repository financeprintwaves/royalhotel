

## Fix: Stop Double-Encoding portion_options at the Source

### Problem

In `src/services/menuService.ts`, portion options are manually stringified with `JSON.stringify()` before being sent to the database. Since the `portion_options` column is JSONB, Supabase automatically serializes JSON -- so the manual stringify causes double-encoding (a string containing JSON, instead of a native JSON array).

### Changes

**File: `src/services/menuService.ts`**

1. **Line 222** (in `createMenuItemForBranch`): Change:
   ```
   portion_options: options.portionOptions ? JSON.stringify(options.portionOptions) : null,
   ```
   To:
   ```
   portion_options: options.portionOptions || null,
   ```

2. **Lines 241-244** (in `updateMenuItemWithPortions`): Remove the JSON.stringify serialization block. Change:
   ```
   if (updates.portion_options !== undefined) {
     updateData.portion_options = updates.portion_options ? JSON.stringify(updates.portion_options) : null;
   }
   ```
   To:
   ```
   // No special handling needed -- JSONB column handles serialization automatically
   ```

### Verification

After the fix, go to POS in the RHBR branch and click "Chicken Biryani Regular" to confirm the portion selection dialog appears. Existing double-encoded data will still work thanks to the string-parsing fallback already in POS.tsx and PortionSelectionDialog.tsx. Any newly saved items will store portion_options as native JSON arrays.

### Files Changed

| File | Change |
|------|--------|
| `src/services/menuService.ts` | Remove `JSON.stringify()` from lines 222 and 241-244 |

