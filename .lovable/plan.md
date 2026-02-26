

## Make All Pages Responsive for Tablet and Mobile

### Problem
The POS system currently uses fixed-width sidebars and desktop-only layouts that break on tablets (768px) and phones (<640px). Key issues:
- POS page: fixed `w-80` cart sidebar + `w-32` category sidebar don't collapse
- POS header: navigation buttons overflow on small screens
- NewOrder page: fixed `w-48` + `w-80` sidebars break on mobile
- Dashboard header: buttons overflow on mobile
- Reports page: tab bar overflows on small screens

### Approach
Keep all existing functionality identical. Only adjust CSS classes and add a mobile cart toggle for the POS page.

---

### 1. POS Page (`src/pages/POS.tsx`)

**Header**: Wrap nav buttons in a horizontally scrollable container on mobile; hide button labels on small screens (icons only).

**Menu View**: 
- Category sidebar: `w-32` becomes `w-16 md:w-32` with truncated text on mobile
- Menu grid: `grid-cols-2` stays, works well on all sizes
- Cart sidebar: Hidden on mobile by default. Add a floating cart button (with item count badge) that toggles a full-screen cart overlay on mobile. On tablet/desktop, keep the `w-80` sidebar.

**Floor View**: Already uses FloorCanvas which should scale. Branch selector row: stack vertically on mobile.

**Orders/Kitchen views inside POS**: Already use responsive grid classes (`md:grid-cols-2 lg:grid-cols-3`), no changes needed.

---

### 2. NewOrder Page (`src/pages/NewOrder.tsx`)

**Header**: Step badges wrap on mobile using `flex-wrap`.

**Menu step layout**: Change from 3-column flex to stacked on mobile:
- Categories: horizontal scrollable bar on mobile instead of sidebar
- Cart: bottom sheet/drawer on mobile instead of right sidebar
- On tablet+, keep current sidebar layout

---

### 3. Dashboard Page (`src/pages/Dashboard.tsx`)

**Header**: Stack user info and action buttons vertically on mobile using `flex-col sm:flex-row`.

**Quick Actions**: Already uses `flex-wrap`, works well. Button sizes adjusted to `size="default"` on mobile for better touch targets.

**Stats cards**: Already responsive with `md:grid-cols-2 lg:grid-cols-4`.

---

### 4. Orders Page (`src/pages/Orders.tsx`)

Minor tweaks: ensure search/filter row wraps on mobile, and order card action buttons use `flex-wrap` (already present).

---

### 5. Kitchen Display (`src/pages/KitchenDisplay.tsx`)

Already uses responsive grid. Add `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for better tablet layout.

---

### 6. Reports Page (`src/pages/Reports.tsx`)

Tab list: make horizontally scrollable on mobile with `overflow-x-auto`.

---

### Technical Details

**Mobile Cart Toggle (POS)**: Add a `showMobileCart` state boolean. Use `useIsMobile()` hook (already exists in `src/hooks/use-mobile.tsx`). When mobile:
- Hide the aside cart sidebar
- Show a floating button at bottom-right with cart count
- Clicking it opens a full-height sheet/drawer with the cart contents

**No new dependencies needed** -- uses existing `Sheet` component from shadcn for mobile cart drawer.

**Files to edit:**
| File | Changes |
|------|---------|
| `src/pages/POS.tsx` | Mobile cart drawer, responsive header, responsive category sidebar |
| `src/pages/NewOrder.tsx` | Responsive menu layout with horizontal categories on mobile |
| `src/pages/Dashboard.tsx` | Responsive header stacking |
| `src/pages/Orders.tsx` | Minor flex-wrap fixes |
| `src/pages/KitchenDisplay.tsx` | Grid breakpoint adjustment |
| `src/pages/Reports.tsx` | Scrollable tab bar |

All existing functionality remains unchanged -- only CSS classes and one mobile cart toggle are added.

