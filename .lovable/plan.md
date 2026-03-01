

## Bold & Colorful Mobile/Tablet Theme

### Overview
Create a distinctly different, bold and colorful UI experience for mobile and tablet devices while keeping the current desktop theme unchanged. The mobile theme will feature vivid gradients, large touch-friendly buttons, bright category colors, and a more visual, app-like feel.

### Changes

**1. New Mobile Theme CSS (`src/index.css`)**
- Add mobile-specific CSS variables with bolder, more saturated colors
- Vibrant gradient backgrounds for cards and headers
- Larger border-radius for a softer, more modern mobile feel
- Bolder shadows and color accents

**2. Dashboard (`src/pages/Dashboard.tsx`)**
- Mobile: Full-width colorful gradient header with larger text and avatar
- Quick action buttons become large, icon-prominent tiles with individual background colors (green for POS, blue for Orders, orange for Kitchen, etc.)
- Stat cards get vibrant gradient backgrounds (purple, blue, green, orange) with white text
- Grid layout switches to 2-column for tablets, single column for phones

**3. POS Page (`src/pages/POS.tsx`)**
- Mobile header: Bolder gradient (wider color range), larger nav icons with colored backgrounds per view
- Floor view: Table cards get brighter status colors with larger touch targets
- Menu view: Category sidebar becomes a horizontal scrollable strip with colorful pill buttons; menu item cards get colored category borders/headers
- Mobile cart sheet: Colorful header gradient, larger action buttons with distinct colors (green for confirm, blue for pay, orange for kitchen)
- Floating cart button: Larger with a pulsing badge

**4. Auth Page (`src/pages/AuthPage.tsx`)**
- Mobile: Full-screen gradient background, centered card with rounded corners and shadow

### Technical Approach

All changes use Tailwind responsive classes (`md:` prefix for desktop overrides) so mobile gets the bold theme by default and desktop retains the current clean look. No new dependencies needed.

Key patterns:
- Mobile-first bold styles with `md:` overrides to restore desktop look
- New utility classes in `src/index.css` for mobile-specific gradients
- Conditional className logic using the existing `useIsMobile()` hook for complex differences

### Files Modified
| File | Change |
|------|--------|
| `src/index.css` | Add mobile-specific gradient utilities and color overrides |
| `src/pages/Dashboard.tsx` | Colorful tile layout, gradient stat cards, vibrant header on mobile |
| `src/pages/POS.tsx` | Bold nav buttons, colorful category pills, vivid cart sheet, larger touch targets |
| `src/pages/AuthPage.tsx` | Gradient background on mobile |

### What Won't Change
- Desktop layout and theme remain exactly the same
- All functionality stays identical
- No new dependencies

