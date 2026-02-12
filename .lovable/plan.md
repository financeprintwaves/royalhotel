

## Fix: Branch Edit Dialog for Managers + Confirm All 3 Features Work

### Problem Found

The edit/logo-upload dialog in Branch Management is wrapped inside `{isAdmin && (...)}` (line 229). This means:
- Only admins can see the dialog
- When a manager clicks the edit pencil button, nothing happens because the Dialog component isn't rendered for them
- Managers cannot upload logos for their branch

### Fix (Single File Change)

**File: `src/pages/BranchManagement.tsx`**

Move the Dialog component outside the `{isAdmin && (...)}` block so it renders for both admins and managers:

1. Keep the "Add Branch" button inside `{isAdmin && (...)}` (only admins can create branches)
2. Move the `<Dialog open={dialogOpen} ...>` with its `<DialogContent>` outside and after the header, so it renders for any user with `canManage` permission
3. The "Add Branch" button simply calls `openDialog()` and sets `dialogOpen = true`

This is a structural move -- no new logic needed. The `canEditBranch()` function already correctly allows managers to edit their own branch.

### Already Implemented (No Changes Needed)

These features are already working in the codebase from the previous implementation:

| Feature | Status | How It Works |
|---------|--------|--------------|
| Portion name on receipt | Done | `portion_name` column exists in `order_items`, saved via `addOrderItemsBatch`, displayed in `Receipt.tsx` line 181 |
| Order ringtone | Done | `notificationSound.ts` plays Web Audio chime, triggered in `Orders.tsx` and `KitchenDisplay.tsx` on new order insert |
| Logo on receipt | Done | `logo_url` column exists in `branches`, `ReceiptDialog.tsx` fetches it, `Receipt.tsx` renders it in header |
| Logo upload UI | Partially done | The upload form exists but is only visible to admins due to the dialog bug above |

### Technical Detail

The fix restructures lines 229-306 of `BranchManagement.tsx`:

**Before:**
```
{isAdmin && (
  <Dialog open={dialogOpen} ...>
    <DialogTrigger><Button>Add Branch</Button></DialogTrigger>
    <DialogContent>...form with logo upload...</DialogContent>
  </Dialog>
)}
```

**After:**
```
{isAdmin && (
  <Button onClick={() => openDialog()}>Add Branch</Button>
)}

{/* Dialog rendered for all managers/admins */}
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent>...form with logo upload...</DialogContent>
</Dialog>
```

Only one file is changed: `src/pages/BranchManagement.tsx`.

