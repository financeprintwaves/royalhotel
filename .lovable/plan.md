
## Plan: Fix Menu Management Portion Options and Multi-Branch Selection

### Issues Identified

| Issue | Root Cause |
|-------|------------|
| Portion options not reflecting when editing | `item.portion_options` comes from DB as JSON string, not parsed array |
| Portion options UI hardcodes "ml" | Size field label says "ml" but sizes can be any unit (e.g., "Regular", "Large") |
| Admin can only select one branch | Single-select dropdown instead of multi-select for branch assignment |

---

### Solution

#### 1. Fix Portion Options Loading (MenuManagement.tsx)

When loading an item for editing, parse the `portion_options` if it's a string:

```typescript
// In openItemDialog() function
const rawPortions = item.portion_options;
const parsedPortions = typeof rawPortions === 'string' 
  ? JSON.parse(rawPortions) 
  : Array.isArray(rawPortions) ? rawPortions : [];
setPortionOptions(parsedPortions);
```

#### 2. Update Portion Options UI for Flexible Size Label

Change the "ml" input to a generic "Size (optional)" field that can accept any text (e.g., "30ml", "Regular", "XL", "500g"):

**Current UI:**
```
[Name (e.g., Small)] [Price] [ml field] [X]
```

**Updated UI:**
```
[Name (e.g., Small)] [Price] [Size (optional)] [X]
```

Update the `PortionOption` type to use a string `size` instead of `size_ml`:

```typescript
// types/pos.ts - Update PortionOption interface
export interface PortionOption {
  name: string;      // "Small", "Medium", "Large", etc.
  price: number;     // Price for this portion
  size?: string;     // Optional size label: "30ml", "Regular", "500g", etc.
}
```

**Note:** Keep backward compatibility by mapping `size_ml` to `size` when loading existing data.

#### 3. Add Multi-Branch Selection for Admins

Replace single-select branch dropdown with checkboxes for admins:

```typescript
// New state for multi-branch selection
const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

// UI: Show checkboxes for each branch
{isAdmin && !editingItem && (
  <div className="space-y-2">
    <Label>Branches</Label>
    <p className="text-xs text-muted-foreground">Select branches to add this item</p>
    <div className="space-y-2 max-h-32 overflow-auto">
      {branches.map((branch) => (
        <div key={branch.id} className="flex items-center gap-2">
          <Checkbox 
            checked={selectedBranchIds.includes(branch.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedBranchIds(prev => [...prev, branch.id]);
              } else {
                setSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
              }
            }}
          />
          <Label>{branch.name}</Label>
        </div>
      ))}
    </div>
  </div>
)}
```

#### 4. Update Save Logic for Multi-Branch Creation

When admin selects multiple branches, create the menu item in each branch:

```typescript
// In handleSaveItem()
if (!editingItem && selectedBranchIds.length > 0) {
  // Create item in each selected branch
  for (const branchId of selectedBranchIds) {
    await createMenuItemForBranch(branchId, itemData);
  }
} else {
  // Existing single-branch logic
}
```

#### 5. Update PortionSelectionDialog for Size Flexibility

The dialog already handles portion options, but update it to show `size` instead of `size_ml`:

```typescript
{portion.size && (
  <p className="text-xs text-muted-foreground mt-1">
    {portion.size}
  </p>
)}
```

---

### File Changes

| File | Changes |
|------|---------|
| `src/types/pos.ts` | Update `PortionOption.size_ml` to `size` (string) for flexibility |
| `src/pages/MenuManagement.tsx` | 1. Parse portion_options from JSON string when editing 2. Change "ml" input to "Size (optional)" text field 3. Add multi-branch checkbox selection for admins 4. Update save logic for multi-branch creation |
| `src/services/menuService.ts` | Add `createMenuItemForBranch()` function to accept branch_id parameter |
| `src/components/PortionSelectionDialog.tsx` | Show `portion.size` instead of `portion.size_ml` |

---

### Technical Details

**Backward Compatibility:**
- When loading existing items with `size_ml`, convert to `size` string (e.g., `"${size_ml}ml"`)
- New items will use the string `size` field directly

**Multi-Branch Creation Flow:**
```
Admin creates item → Selects branches [Branch A, Branch B] → Save
                           ↓
               Creates item in Branch A
                           ↓
               Creates item in Branch B
                           ↓
            Creates inventory for each if enabled
```

---

### Summary

| Before | After |
|--------|-------|
| Portion options show empty when editing | Portion options correctly parsed and displayed |
| Size field only accepts ml (number) | Size field accepts any text ("30ml", "Regular", "XL") |
| Admin selects one branch at a time | Admin can select multiple branches with checkboxes |
| Item created in single branch | Item created in all selected branches simultaneously |
