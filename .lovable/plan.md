

## Plan: Professional POS Terminal Redesign

### Problems with Current POS
1. **Monotone blue-on-blue** everywhere — poor contrast, hard to distinguish sections
2. **Emoji icons** (🖨️ 💳 🛒) instead of proper Lucide icons — looks amateur
3. **Menu items in single column** with h-40 image placeholders — wastes space, low density
4. **aspect-square buttons** making action buttons enormous squares
5. **Gradient text effects** on prices — hard to read
6. **Redundant headers** — POSLayout shows total AND POSOrderPanel shows "Order Summary" header with total again
7. **Build errors**: `unit_price` doesn't exist on CartItem, `discount` doesn't exist on Order, `icon` doesn't exist on MenuItem, `items` doesn't exist on Order, `HOLD` not valid OrderStatus

### Design Direction
Clean, dark-themed professional POS (slate-900 base) with:
- High-contrast white text on dark backgrounds
- Color-coded semantic actions (green = pay, orange = KOT, red = void/cancel)
- Compact information density — no wasted space
- Proper Lucide icons throughout
- Menu items in a responsive grid (3-4 columns on desktop)
- Compact cart rows without excessive padding

### Files to Change

| File | Change |
|------|--------|
| `src/contexts/POSContext.tsx` | Fix `unit_price` → `menuItem.price`, remove `discount` reference |
| `src/components/pos/POSLayout.tsx` | Professional dark theme, compact buttons (no aspect-square), Lucide icons, tighter spacing |
| `src/components/pos/POSOrderPanel.tsx` | Remove redundant header, compact totals, clean dark styling |
| `src/components/pos/POSMenuPanel.tsx` | Multi-column grid (3-4 cols), compact category pills, cleaner search |
| `src/components/pos/MenuItemCard.tsx` | Compact horizontal card (no h-40 image area), remove `icon`/`is_favorite`/`is_daily_special` refs, proper grid item |
| `src/components/pos/CartItemRow.tsx` | Compact row, remove gradient text, readable prices, tighter padding |
| `src/components/pos/POSActionPanel.tsx` | Compact function grid, proper Lucide icons, semantic colors |
| `src/components/pos/POSTableSelector.tsx` | Clean styling matching new theme |
| `src/components/pos/OrdersDialog.tsx` | Fix mock data to match Order type (remove `items`, `HOLD` status) |
| `src/components/pos/HoldOrdersPanel.tsx` | Use `any` cast for items access (held orders store cart items separately) |

### Key Design Decisions
- **Color scheme**: Slate-900/800 base, white text, green for money/pay, amber for KOT, blue for info
- **Menu grid**: 3 columns desktop, 2 tablet, 1 mobile — compact cards showing name + price + add button
- **Cart**: Tight single-line rows with inline quantity controls
- **Action panel**: Small rectangular buttons in a grid, not huge squares
- **No emojis**: All Lucide icons (Printer, CreditCard, Pause, LogOut, etc.)
- **Panel widths**: Left 25% (cart), Center 50% (menu), Right 25% (actions) — more menu space

