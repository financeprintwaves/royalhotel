

## POS Menu: Polished 2-Column Grid + Category Dropdown

### Changes

#### 1. Replace mobile category chips with a Select dropdown (src/pages/POS.tsx)

Replace the horizontal scrollable chip strip (`md:hidden` block, lines 1002-1023) with a `Select` dropdown component:

- Use the existing `Select`/`SelectContent`/`SelectItem` components already imported
- "All Categories" as default/placeholder
- Each category as a `SelectItem`
- Styled with `h-12 rounded-xl text-base font-semibold` for large touch target
- Wrapped in a `p-2 border-b bg-card` container, same as current strip
- Desktop sidebar remains unchanged

#### 2. Polish the 2-column product grid cards (src/pages/POS.tsx)

Refine the existing cards (lines 1048-1087) for a cleaner, more premium look:

- Remove the large `aspect-square` image (takes too much vertical space in 2-col) -- replace with a compact `w-14 h-14` image/icon on the left, making each card a **horizontal mini-card** layout (`flex-row`)
- Card structure: `flex flex-row items-center gap-2 p-2`
  - Left: 56px square image placeholder (rounded-lg)
  - Center: Name (line-clamp-1, text-xs) + Price (bold, text-sm)
  - Right: Small `+` button (w-8 h-8)
- This keeps cards compact and fits cleanly in 2 columns on 360px screens
- Grid stays `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2`

#### 3. Files modified

| File | Change |
|------|--------|
| `src/pages/POS.tsx` | Replace mobile category chips with Select dropdown; redesign product cards to compact horizontal layout |

### Result
- Category filtering via a clean dropdown instead of scrollable chips
- Compact 2-column product cards that fit perfectly on 360px mobile
- No horizontal overflow
- Desktop layout unchanged

