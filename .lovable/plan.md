

## Plan: Rename "Dancer" to "Person Name" + Bold FOC on Invoice + Fix Portion Selection Bug

### Issue 1: Rename "Dancer Name" to "Person Name"

All references to "Dancer" in the UI will be changed to "Person" across these files:

| File | Change |
|------|--------|
| `src/pages/POS.tsx` | Placeholder "Dancer Name (required)" -> "Person Name (required)", toast messages |
| `src/pages/Reports.tsx` | FOC tab: "Dancers" card -> "Persons", "FOC by Dancer" -> "FOC by Person", table headers |
| `src/services/reportingService.ts` | Interface field names `dancer_name` -> `person_name`, `dancerSummary` -> `personSummary` |
| `src/components/ExportButtons.tsx` | CSV headers "Dancer" -> "Person" |
| `src/components/PrintableReport.tsx` | Print headers "Dancer" -> "Person" |

Note: The database column `foc_dancer_name` stays unchanged to avoid a migration -- only UI labels change.

### Issue 2: Bold "FOC" on Invoice/Receipt

In `src/components/Receipt.tsx`, add a bold **FOC** label when the order is marked as FOC. After the order info section, add:

```
===== FOC =====
Person: [Name]
```

Styled with large, bold text so it stands out on the thermal receipt.

### Issue 3: Menu Item Portions Not Showing

The bug is in `src/pages/POS.tsx` line 244:

```typescript
if (item.portion_options && item.portion_options.length > 0) {
```

When `portion_options` comes from the database as a JSONB value, it could be an object (not an array), so `.length` is undefined and the condition fails. The `PortionSelectionDialog` already handles this with `Array.isArray()`, but the POS click handler does not.

**Fix**: Use `Array.isArray()` check:

```typescript
const portions = Array.isArray(item.portion_options) ? item.portion_options : [];
if (portions.length > 0) {
```

This ensures items with portion options (like the "rhbr" menu item) correctly show the portion selection dialog.

---

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Rename "Dancer" -> "Person" in UI text; fix `Array.isArray` check for portion_options |
| `src/components/Receipt.tsx` | Add bold FOC label with person name; accept `is_foc` and `foc_dancer_name` from order |
| `src/pages/Reports.tsx` | Rename all "Dancer" labels to "Person" |
| `src/services/reportingService.ts` | Rename interface fields and variables from dancer to person |
| `src/components/ExportButtons.tsx` | Rename CSV headers from Dancer to Person |
| `src/components/PrintableReport.tsx` | Rename print headers from Dancer to Person |

