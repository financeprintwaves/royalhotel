

## Fix: Hidden Scrollbar + Menu View Layout on Mobile

### Problems Identified

1. **Scrollbar visible**: The slim scrollbar styling is still showing. Need to fully hide scrollbars while keeping scroll functionality.

2. **POS Menu view broken on mobile**: The menu view container (`line 996`) uses `flex` (horizontal direction) and places the mobile category chips, desktop sidebar, and product grid as horizontal siblings. On mobile, the chips appear squished beside the main content instead of stacking vertically above it. This makes the menu items invisible or inaccessible.

3. **MenuManagement page**: The `ScrollArea` inside the dialog (`max-h-[70vh]`) may not scroll properly on some mobile browsers. The main content area also lacks proper mobile scroll handling.

---

### Fix 1: Hide all scrollbars globally (`src/index.css`)

- Change the global scrollbar styles to be fully hidden (width: 0, display: none) while preserving `overflow-y: auto` scroll behavior.
- Keep the `.scrollbar-hide` utility as-is for explicit use.
- Apply hidden scrollbar to `html`, `body`, `#root` globally so no scrollbar is ever visible.

### Fix 2: POS Menu View layout (`src/pages/POS.tsx`)

Change the menu view from a single horizontal `flex` to a vertical column layout on mobile:

- Wrap the menu view in `flex flex-col md:flex-row` instead of just `flex`
- The mobile category chips (`md:hidden`) stay as a horizontal scroll strip at the top
- The desktop sidebar (`hidden md:block`) and product grid sit below in a horizontal flex on desktop
- The product `main` area gets `overflow-y-auto` so it scrolls vertically on mobile

Specifically:
```
Before (line 996):
<div className="flex-1 flex overflow-hidden">
  <div className="md:hidden flex ...">chips</div>  // horizontal child
  <aside className="hidden md:block ...">sidebar</aside>
  <main>grid</main>
</div>

After:
<div className="flex-1 flex flex-col overflow-hidden">
  <div className="md:hidden flex ...">chips</div>  // stacks on top
  <div className="flex-1 flex overflow-hidden">
    <aside className="hidden md:block ...">sidebar</aside>
    <main className="flex-1 overflow-y-auto p-4">grid</main>
  </div>
</div>
```

### Fix 3: MenuManagement dialog scroll (`src/pages/MenuManagement.tsx`)

- Ensure the `DialogContent` uses `overflow-y-auto` properly
- No major structural change needed; the `ScrollArea` with `max-h-[70vh]` should work. Will verify and add `overflow-y-auto` fallback if needed.

---

### Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Hide all scrollbars globally (width: 0 / display: none) |
| `src/pages/POS.tsx` | Fix menu view to use `flex-col` on mobile so chips stack above product grid |
| `src/pages/MenuManagement.tsx` | Ensure dialog content scrolls properly on mobile |

