
### Fix scope
Resolve the mobile POS category strip so users can scroll through all categories while keeping scrollbars invisible.  
This will be a targeted fix in the POS menu view (and a small safety pass on related overflow containers), without changing business logic or desktop behavior.

### Root cause (from current code)
In `src/pages/POS.tsx`, the category row is visually set to `overflow-x-auto`, but surrounding flex containers use `overflow-hidden` and are missing critical flex constraints (`min-w-0` / `min-h-0`), which can block or break scroll behavior on small screens and some mobile browsers.  
Also, the category strip lacks mobile momentum/touch-optimized horizontal scrolling settings.

### Implementation plan

1. **Harden the mobile category chip scroller in POS**
   - Update the category strip container (currently around line ~998) to ensure true horizontal scrolling:
     - Keep `overflow-x-auto`
     - Add `overflow-y-hidden`
     - Add `w-full min-w-0`
     - Add touch scrolling helpers:
       - `touch-pan-x`
       - `[-webkit-overflow-scrolling:touch]`
     - Keep scrollbar hidden with existing `scrollbar-hide`
   - Ensure every chip remains non-shrinking:
     - Use `flex-none` (or keep `shrink-0`) + `whitespace-nowrap`

2. **Fix flex overflow constraints around menu layout**
   - Add `min-h-0` / `min-w-0` to the menu view wrapper stack so nested scroll areas can actually scroll:
     - Outer menu wrapper (`flex-1 flex flex-col overflow-hidden`) → add `min-h-0 min-w-0`
     - Inner content row (`flex-1 flex overflow-hidden`) → add `min-h-0 min-w-0`
     - Product pane (`main`) → use `min-h-0 min-w-0 overflow-y-auto`
   - This prevents hidden clipping from swallowing touch scroll and keeps desktop sidebar behavior unchanged.

3. **Preserve “scroll works, scrollbar hidden” behavior globally**
   - Keep global hidden scrollbar behavior in `src/index.css` (no visible bars)
   - Do **not** disable overflow scrolling itself
   - Retain `.scrollbar-hide` utility for horizontal strips (category row, nav rows)

4. **Optional stability pass (if needed after step 1–2)**
   - If category scrolling still feels blocked on specific devices, add `overscroll-x-contain` to the strip.
   - If menu dialog scrolling is still problematic, switch the form container from `ScrollArea max-h[...]` pattern to a straightforward native `div` with `max-h-[70vh] overflow-y-auto` (mobile-safe fallback).

### Files to update
- `src/pages/POS.tsx` (primary fix)
- `src/index.css` (only if a tiny helper utility is needed; otherwise unchanged)

### Expected outcome
- Users can swipe horizontally through all menu categories on mobile.
- Scrollbars remain invisible.
- Product grid remains vertically scrollable.
- No horizontal page overflow is introduced.
- Desktop layout and functionality remain unchanged.

### Verification checklist
- On 360px, 390px, 414px widths:
  - Category chips are fully swipeable left/right.
  - No visible scrollbar appears.
  - Product list still scrolls vertically.
- On tablet (768–1024):
  - Layout remains aligned and usable.
- On desktop:
  - Existing menu sidebar behavior is unchanged.
