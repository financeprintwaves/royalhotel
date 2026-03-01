

## Tables Page -- Match Reference Screenshot Layout

### Single File Change: `src/pages/Tables.tsx`

Restructure the card internals to exactly match the reference screenshot layout:

```text
+---------------------------+
| Table Number     [Action] |
| X seats                   |
| [Status Badge]            |
+---------------------------+
```

### Card Layout Changes (lines 72-104)

Replace the current `flex-row` layout with a vertical card structure:

- **Top row**: Table number (bold, left) + Action button (right) using `flex justify-between items-start`
- **Middle**: "X seats" text (small, muted)
- **Bottom**: Status badge (left-aligned, colored)
- Remove the `md:block md:text-center` responsive split -- use the same layout on all screens
- Card padding: `p-3` consistent across breakpoints
- Keep the existing `border-2 rounded-xl` with `STATUS_STYLES` color coding

### Grid
- Keep `grid-cols-2` for mobile/tablet (already correct)
- Keep `lg:grid-cols-4 xl:grid-cols-5` for desktop

### No other files changed

