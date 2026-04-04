# POS UI Layout Reference

## Desktop Layout (3-Panel View)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Royal Hotel POS                                │
├──────────────────────────┬───────────────────────┬──────────────────────┤
│                          │                       │                      │
│    ORDER SUMMARY         │    MENU ITEMS         │  ACTION PANEL        │
│    (25% width)           │    (50% width)        │  (25% width)         │
│                          │                       │                      │
│ ┌──────────────────────┐ │                       │ ┌──────────────────┐ │
│ │ Table / Takeout      │ │  ┌─────────────────┐  │ │ HOLD │ RECALL    │ │
│ │                      │ │  │  Biryani - $50  │  │ ├──────────────────┤ │
│ │ Total: $125.50       │ │  │  Add  Qty: 1+  │  │ │ FUNCTIONS        │ │
│ │                      │ │  └─────────────────┘  │ │ ┌──────────────┐ │ │
│ ├──────────────────────┤ │                       │ │ │EXIT │KOT │BILL│ │ │
│ │ Biryani × 2    $100  │ │  ┌─────────────────┐  │ │ └──────────────┘ │ │
│ │ (Remove)             │ │  │  Raita - $12    │  │ │ ┌──────────────┐ │ │
│ │                      │ │  │  Add  Qty: 1+  │  │ │ │ TAX │DISC│VOI│ │ │
│ │ Naan × 1      $15    │ │  └─────────────────┘  │ │ └──────────────┘ │ │
│ │ (Remove)             │ │                       │ │ ┌──────────────┐ │ │
│ │                      │ │  ┌─────────────────┐  │ │ │NOTE│HELP     │ │ │
│ │ Raita × 1     $12.50 │ │  │  Naan - $15     │  │ │ └──────────────┘ │ │
│ │ (Remove)             │ │  │  Add  Qty: 1+  │  │ ├──────────────────┤ │
│ │                      │ │  └─────────────────┘  │ │ PAYMENTS         │ │
│ │ Subtotal: $127.50    │ │                       │ │ ┌──────────────┐ │ │
│ │ Tax: $0              │ │                       │ │ │ CASH (sq)    │ │ │
│ │ Discount: $0         │ │                       │ │ └──────────────┘ │ │
│ │ ╔════════════════════╗ │                       │ │ ┌──────────────┐ │ │
│ │ ║    $125.50         ║ │                       │ │ │ CARD (sq)    │ │ │
│ │ ╚════════════════════╝ │                       │ │ └──────────────┘ │ │
│ ├──────────────────────┤ │                       │ │ ┌──────────────┐ │ │
│ │ Hold Order           │ │                       │ │ │ OTHER (sq)   │ │ │
│ │ Print KOT            │ │                       │ │ └──────────────┘ │ │
│ │ Payment              │ │                       │ └──────────────────┘ │
│ └──────────────────────┘ │                       └──────────────────────┘
│                          │                       │
└──────────────────────────┴───────────────────────┴──────────────────────┘
```

## Payment Dialog (Modal)

```
┌─────────────────────────────────────────┐
│  Payment                             [X]│
├─────────────────────────────────────────┤
│                                         │
│  [Cash] [Card] [Transfer]               │
│                                         │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ TOTAL AMOUNT                    ┃  │
│ ┃ $125.50                         ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                         │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ AMOUNT RECEIVED                 ┃  │
│ ┃ ┌─────────────────────────────┐ ┃  │
│ ┃ │ 150.00                  ◄ │ ┃  │
│ ┃ └─────────────────────────────┘ ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ CHANGE DUE                        ││
│ │ $24.50                            ││
│ └─────────────────────────────────────┘│
│                                         │
│  ┌─┐ ┌─┐ ┌─┐                           │
│  │7│ │8│ │9│                           │
│  └─┘ └─┘ └─┘                           │
│  ┌─┐ ┌─┐ ┌─┐                           │
│  │4│ │5│ │6│                           │
│  └─┘ └─┘ └─┘                           │
│  ┌─┐ ┌─┐ ┌───┐                         │
│  │1│ │2│ │CLR│                         │
│  └─┘ └─┘ └───┘                         │
│  ┌───┐ ┌─┐ ┌─────────────┐             │
│  │ 0 │ │00 ← BACKSPACE  │             │
│  └───┘ └─┘ └─────────────┘             │
│                                         │
│  [ ADD TIP (F4) ]                       │
│                                         │
├─────────────────────────────────────────┤
│ [Back F1]          [Proceed Payment]    │
└─────────────────────────────────────────┘

Payment Status Indicators:
┌─────────────────────────────┐
│ received < total            │
│ Red background              │
│ REMAINING BALANCE: $X.XX    │
│ (Proceed button DISABLED)   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ received >= total           │
│ Green background            │
│ CHANGE DUE: $X.XX          │
│ (Proceed button ENABLED)    │
└─────────────────────────────┘
```

## KOT Dialog (Modal)

```
┌──────────────────────────────────────────────────────────┐
│  Kitchen Order Ticket                                 [X]│
├──────────────────────────────────────────────────────────┤
│  Today's KOT Orders                              [5 KOTs]│
├──────────────────────────────────────────────────────────┤
│                                                           │
│ KOT#    │ Table/Type │ Status          │ Time │ Actions│
│────────────────────────────────────────────────────────│
│ KOT001  │ Table 5    │ [CREATED]       │14:32 │[Edit][Pr]
│ KOT002  │ Takeaway   │ [SENT_TO_KIT]   │14:28 │[Edit][Pr]
│ KOT003  │ Table 8    │ [SERVED]        │14:15 │[Edit][Pr]
│ KOT004  │ Table 2    │ [BILL_REQ]      │14:12 │[Edit][Pr]
│ KOT005  │ Table 12   │ [PAID]          │14:05 │[Edit][Pr]
│                                                           │
│ (Scrollable - more KOTs below)                           │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                          [Close]          │
└──────────────────────────────────────────────────────────┘
```

## Bills Dialog (Modal)

```
┌──────────────────────────────────────────────────────────────┐
│  Bills Management                                         [X]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  [Pending Bills (3)] [Paid Bills (5)] [All Bills (8)]        │
│                                                               │
│  ═══════════════════════════════════════════════════════════ │
│  PENDING BILLS TAB (Selected)                                 │
│  ═════════════════════════════════════════════════════════════│
│                                                               │
│ Bill# │Table/Type │ Status  │ Amount  │  Time │ Actions   │
│─────────────────────────────────────────────────────────────│
│ BILL1 │ Table 5   │ PENDING │ $25.50  │ 14:32 │[View][Pr] │
│ BILL2 │ Table 8   │ PENDING │ $45.75  │ 14:28 │[View][Pr] │
│ BILL3 │ Takeaway  │ PENDING │ $18.90  │ 14:15 │[View][Pr] │
│                                                               │
│  Alternative: PAID BILLS TAB                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Bill# │Table/Type │ Status │ Amount  │ Time │ Actions  │ │
│  │─────────────────────────────────────────────────────────│ │
│  │ BILL4 │ Table 12  │ PAID   │ $65.25  │ 14:05│[View][Pr]│ │
│  │ BILL5 │ Table 3   │ PAID   │ $42.00  │ 13:55│[View][Pr]│ │
│  │ ...more...                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Alternative: ALL BILLS TAB                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ (Combined list of all pending and paid bills)          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                              [Close]          │
└──────────────────────────────────────────────────────────────┘
```

## Receipt Preview (View Action)

```
┌─────────────────────────────────────────┐
│  Receipt                             [X]│
├─────────────────────────────────────────┤
│                                         │
│        RESTAURANT NAME                  │
│        123 Main Street                  │
│        City, State 12345                │
│        Phone: (555) 123-4567             │
│                                         │
│ ─────────────────────────────────────── │
│            RECEIPT                      │
│ Order: BILL20260404001                  │
│ 2026/04/04 14:32                        │
│ ─────────────────────────────────────── │
│                                         │
│ Biryani × 2              $100.00        │
│ Raita × 1                 $12.50        │
│ Naan × 1                  $15.00        │
│                                         │
│ ─────────────────────────────────────── │
│ Subtotal:               $127.50         │
│ Tax (0%):                  $0.00        │
│                                         │
│ ═════════════════════════════════════ │
│ Total:                  $127.50         │
│ ═════════════════════════════════════ │
│                                         │
│  Thank you for your business!           │
│  Please come again.                     │
│                                         │
├─────────────────────────────────────────┤
│ [Back]           [Print Again]          │
└─────────────────────────────────────────┘
```

## Key Visual Components

### Square Buttons (1:1 Aspect Ratio)
```
┌───────┐     ┌───────┐
│ HOLD  │     │ CASH  │
│  ⏸   │     │ 💵    │
└───────┘     └───────┘

Each button: width = height
Perfect squares for touch
```

### Color Scheme
```
Red:      Exit, Void, Insufficient Amount     #DC2626
Amber:    Hold, Discount                      #D97706
Orange:   Print, KOT                          #EA580C
Blue:     Card Payment, Info                  #3B82F6
Sky:      Recall, Secondary                   #0EA5E9
Emerald:  Cash, OK, Paid                      #059669
Purple:   Other Payment, Transfer             #A855F7
Gray:     Neutral, Disabled                   #64748B
```

### Status Badge Colors
```
Blue:      CREATED         (pending action)
Orange:    SENT_TO_KITCHEN (in progress)
Green:     SERVED          (ready)
Amber:     BILL_REQUESTED  (awaiting payment)
Emerald:   PAID            (complete)
Gray:      CLOSED          (archived)
```

## Responsive Breakpoints

### Mobile (< 768px)
- Single column layout
- Full-width buttons
- Compact header with order count
- Bottom action bar (KOT, Pay)
- Menu items scroll vertically

### Tablet (768px - 1024px)
- 2-column layout (Menu + Cart)
- Reduced action panel
- Larger buttons for touch
- Horizontal scroll for menu

### Desktop (> 1024px)
- 3-column layout (Cart, Menu, Actions)
- Full action panel with all buttons
- Side-by-side layout
- Clear visual hierarchy

## Keyboard Shortcuts Visual

```
┌─────────────────────────┐
│ KEYBOARD SHORTCUTS      │
├─────────────────────────┤
│ F3: Cash Payment        │
│ F4: Card Payment        │
│ F5: Bank Transfer       │
│ F6: Find Order          │
│ F7: Transfer Order      │
│ F8: Void Order          │
│ F9: Settings            │
└─────────────────────────┘
```

## Print Output Formats

### KOT (Kitchen Order Ticket)
```
════════════════════════════════
     KITCHEN ORDER TICKET
════════════════════════════════
Table 5 | 14:32:45
Order: KOT20260404001
────────────────────────────────
Biryani                      × 2
 → Special: Extra Spicy
Raita                        × 1
Naan                         × 3
 → Note: Butter on side
════════════════════════════════
2026/04/04 14:32:45
```

### Receipt/Bill
```
     ROYAL HOTEL RESTAURANT
     123 Main Street
     New Delhi, India 110001
     Ph: +91 98765 43210

          ╔════════════╗
          ║  RECEIPT   ║
          ╚════════════╝

Order: BILL20260404001
Date: 2026/04/04
Time: 14:32:45

────────────────────────────────
Item                    Qty  Amt
────────────────────────────────
Biryani                   2 $100
Raita                     1 $12.50
Naan                      1 $15
────────────────────────────────

Subtotal:               $127.50
Tax (0%):                  $0.00
────────────────────────────────
Total:                  $127.50
Received:               $150.00
Change:                  $22.50
────────────────────────────────

Thank you for dining with us!
Please visit again soon.

Powered by Royal Hotel
```
