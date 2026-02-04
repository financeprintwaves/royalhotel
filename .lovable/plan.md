

## Plan: Fix Blank Print Screen Issue

### Problem Analysis

The print shows a blank page because of **incorrect CSS selector targeting**:

| Issue | Cause |
|-------|-------|
| Blank print output | CSS rule `body > *:not(.print-receipt-container)` hides ALL direct children of body |
| Container not visible | `.print-receipt-container` is nested inside Dialog → React root, NOT a direct child of body |
| react-to-print uses iframe | Print happens in a new iframe context, so body-level CSS doesn't apply correctly |

**Current HTML Structure:**
```
body
└── #root (React app) ← This gets hidden!
    └── Dialog
        └── .print-receipt-container ← Never seen because parent is hidden
```

---

### Solution

#### 1. Remove Broken Print CSS Selectors (index.css)

Remove the selector that hides everything. `react-to-print` already handles isolating the print content in its own iframe - we don't need to manually hide other elements.

**Changes to index.css:**
```css
/* Thermal Printer Optimizations */
@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* REMOVED: body > *:not(.print-receipt-container) - this was hiding everything */
  
  /* Receipt container styling for print */
  .print-receipt-container {
    width: 80mm !important;
    padding: 0 4mm !important;
    background: white !important;
    margin: 0 !important;
  }
  
  /* Force pure black text for thermal printers */
  .print-receipt-container,
  .print-receipt-container * {
    color: #000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Ensure borders print clearly */
  .print-receipt-container [style*="border"] {
    border-color: #000 !important;
  }
}
```

#### 2. Improve react-to-print Configuration (ReceiptDialog.tsx)

Add print-specific styles to the `useReactToPrint` hook to ensure proper rendering in the print iframe:

```typescript
const handlePrint = useReactToPrint({
  contentRef: receiptRef,
  documentTitle: `Receipt-${order?.order_number || order?.id?.slice(-8)}`,
  pageStyle: `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `,
});
```

---

### File Changes

| File | Change |
|------|--------|
| src/index.css | Remove `body > *:not(.print-receipt-container)` rule that hides everything |
| src/components/ReceiptDialog.tsx | Add `pageStyle` to `useReactToPrint` for proper print iframe styling |

---

### Why This Fix Works

1. **react-to-print creates a new iframe** - It copies only the ref'd element into a clean iframe for printing
2. **No need to hide other elements** - The iframe only contains the receipt
3. **Page styles inject into iframe** - `pageStyle` prop adds CSS directly to the print iframe
4. **Pure black text preserved** - Container-level CSS still forces high contrast

---

### Summary

| Before | After |
|--------|-------|
| CSS hides React root → blank print | CSS only styles receipt container |
| No iframe-specific styles | `pageStyle` prop injects print CSS |
| Broken selector targeting | Clean, working print output |

