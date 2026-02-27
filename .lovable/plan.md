

## Fix FOC Flow Not Working on Mobile/Tablet

### Problem
The mobile cart sheet (used on screens smaller than 768px) is missing two critical UI elements that exist in the desktop cart sidebar:
1. The FOC toggle button (ON/OFF)
2. The FOC person name input field

Without these, users on mobile/tablet cannot activate FOC or enter the required person name. The "CONFIRM FOC" button exists in the mobile sheet but is permanently disabled because `focDancerName` is always empty.

### Fix

**File: `src/pages/POS.tsx`**

Add the FOC toggle and person name input to the mobile cart sheet, in the footer section (between the Total display and the action buttons). This mirrors exactly what the desktop sidebar already has:

- FOC toggle button (ON/OFF) with green highlight when active
- Person name input field (shown only when FOC is ON)
- FOC discount display line (shown only when FOC is ON)
- Hide the discount input when FOC is ON (same as desktop)

The changes go inside the mobile cart sheet's `border-t p-4` footer div, right after the Total line and before the action buttons grid.

No new files, no backend changes -- just adding the missing UI controls to the mobile cart sheet so the FOC flow works identically to desktop.
