/**
 * High-Performance Restaurant POS Interface - Architecture & Implementation Guide
 * 
 * This document outlines the complete design and implementation of a touch-optimized,
 * fast billing system with compact grid layouts and silent printing.
 */

# High-Performance Restaurant POS Interface

## 1. Design Principles

### 1.1 Touch Efficiency
- **Square Buttons**: All action panels use `aspect-square` for equal height/width
- **Compact Grid**: 3-column grid for functions, 1-column for payment methods
- **Minimized Clicks**: Action panel contains all critical functions
- **Keyboard Shortcuts**: F1-F9 for fast operations without reaching mouse/touch

### 1.2 Visual Hierarchy
- **Color Coding**: 
  - Red: Exit/Void/Cancel operations
  - Amber: Hold/Discount
  - Emerald: Payment/OK
  - Orange: Print/KOT
  - Blue: Card Payment
  - Purple: Transfer Payment
  - Slate: Neutral/Secondary functions

### 1.3 Real-Time Calculations
- Received amount updates balance/change dynamically
- 100% accurate calculation as user types
- Negative balance shows remaining due in red
- Positive balance shows change due in green

## 2. Component Architecture

### 2.1 POSActionPanel.tsx
**Location**: `/src/components/pos/POSActionPanel.tsx`

**Compact Grid Layout**:
```
┌─────────────────────────┐
│ Hold (1 sq) │ Recall (1 sq) │  <- 2x aspect-square
├─────────────────────────┤
│ Functions (3x3 grid)    │  <- 9 square buttons
│ Exit │ KOT  │ Bills      │
│ Refund│ Tax  │ Discount   │
│ Void │ Note  │ Help       │
├─────────────────────────┤
│ Payment Methods         │  <- 3x1 (stacked vertical)
│ Cash (1 square)         │
│ Card (1 square)         │
│ Other (1 square)        │
└─────────────────────────┘
```

**Features**:
- All buttons track disabled state
- Payment buttons directly open PaymentDialog with pre-selected method
- KOT button opens KOTDialog
- Bills button opens BillsDialog
- Function buttons fully connected to handlers

### 2.2 PaymentDialog.tsx
**Location**: `/src/components/pos/PaymentDialog.tsx`

**Dynamic Calculation Logic**:
```typescript
const received = parseFloat(receivedAmount) || 0;
const balance = received - orderTotal;
const isChange = balance >= 0;
const balanceAmount = Math.abs(balance);

// Display:
// If received < total: Shows "REMAINING BALANCE" in red
// If received >= total: Shows "CHANGE DUE" in green
```

**Transaction Flow**:
1. User enters amount received via numeric keypad or text input
2. Balance/change calculated in real-time
3. "Proceed Payment" button enabled only when received >= total
4. Upon click:
   - Calls `quickPayOrder()` RPC function
   - Generates receipt HTML
   - Sends to `printToLocalPrinter()` (silent, no dialog)
   - Clears cart
   - Shows toast confirmation with change amount
   - Closes dialog

### 2.3 KOTDialog.tsx
**Location**: `/src/components/pos/KOTDialog.tsx`

**Features**:
- List of all day's KOT orders
- Display: KOT #, Table/Takeaway, Status, Time
- Actions:
  - **Edit**: Opens order in POS for item add/remove
  - **Print**: Reprints KOT silently

**Status Colors**:
- Blue: CREATED
- Orange: SENT_TO_KITCHEN
- Green: SERVED
- Amber: BILL_REQUESTED
- Emerald: PAID
- Gray: CLOSED

### 2.4 BillsDialog.tsx
**Location**: `/src/components/pos/BillsDialog.tsx`

**Filter Tabs**:
```
[Pending Bills (3)] [Paid Bills (5)] [All Bills (8)]
```

**Features**:
- Quick filter toggle for bill status
- Display: Bill #, Table/Takeaway, Status, Amount, Time
- Actions:
  - **View**: Opens receipt preview
  - **Print**: Reprints bill silently

**Sorting**: By `created_at` descending (newest first)

### 2.5 Printer Service
**Location**: `/src/services/printerService.ts`

**Print Functions**:

#### `printKOT(tableName, items, orderNumber)`
- Generates KOT HTML with monospace font
- Items listed without prices (kitchen-only)
- Includes order number, table name, timestamp
- Returns Promise<boolean>

#### `printReceipt(order)`
- Generates professional receipt HTML
- Includes all order items with prices
- Shows subtotal, tax, total
- Double-lined format for thermal printer
- Returns Promise<boolean>

**Integration**:
- Uses `printToLocalPrinter()` from `/src/services/printService.ts`
- No browser print dialog
- Silent printing to configured printer
- Handles errors gracefully

## 3. Payment Flow - Detailed

### Step 1: User Clicks Payment Button
```typescript
// In POSActionPanel
const paymentMethods = [
  { 
    label: 'Cash', 
    action: () => { 
      setPaymentMethod('cash'); 
      setShowPaymentDialog(true); 
    }, 
    ...
  },
  // Similar for Card, Other
];
```

### Step 2: PaymentDialog Opens
- Pre-selected payment method shown
- Total Amount displayed prominently
- Input field for amount received

### Step 3: Real-Time Balance Calculation
```typescript
const received = parseFloat(receivedAmount) || 0;
const balance = received - orderTotal;
const isChange = balance >= 0;
const balanceAmount = Math.abs(balance);

// Display logic:
if (isChange) {
  // Green card: "CHANGE DUE: $X.XX"
  // "Proceed Payment" button ENABLED
} else {
  // Red card: "REMAINING BALANCE: $X.XX"
  // "Proceed Payment" button DISABLED
}
```

### Step 4: Silent Payment Processing
```typescript
const handleProceedPayment = async () => {
  // 1. Validate amount
  if (received < orderTotal) {
    toast({ title: 'Insufficient Amount', ... });
    return;
  }

  // 2. Process payment via RPC
  const response = await quickPayOrder(
    orderId,
    received,
    paymentMethod,
    undefined,
    `Tip: $${tipAmount.toFixed(2)}`
  );

  // 3. Print silently
  await printReceipt(mockOrder);

  // 4. Clear and close
  clearCart();
  onClose();
};
```

## 4. KOT Management

### KOT Order Operations

#### Print KOT (New Order)
```typescript
// From POSLayout, when "Print KOT" clicked:
1. Collect items from cart
2. Call printKOT(tableName, items, orderNumber)
3. Show success toast
```

#### Reprint KOT
```typescript
// From KOTDialog, when "Print" clicked:
1. Fetch order from database
2. Extract items
3. Call printKOT(tableName, items, orderNumber)
4. Show success toast
```

#### Edit KOT
```typescript
// From KOTDialog, when "Edit" clicked:
1. Load order into cart
2. Switch to POS layout
3. User can add/remove items
4. Print updated KOT or proceed to payment
```

## 5. Bills Management

### Bills Filtering

#### Pending Bills
```sql
-- Filter: order_status = 'BILL_REQUESTED'
SELECT * FROM orders 
WHERE order_status = 'BILL_REQUESTED' 
AND created_at >= TODAY
ORDER BY created_at DESC
```

#### Paid Bills
```sql
-- Filter: payment_status = 'paid'
SELECT * FROM orders 
WHERE payment_status = 'paid' 
AND created_at >= TODAY
ORDER BY created_at DESC
```

#### All Bills
```sql
-- No filter, all orders today
SELECT * FROM orders 
WHERE created_at >= TODAY
ORDER BY created_at DESC
```

## 6. Keyboard Shortcuts

| Key | Function |
|-----|----------|
| F1  | New Order / Exit |
| F2  | Recall Order |
| F3  | Cash Payment |
| F4  | Card Payment / Add Tip |
| F5  | Bank Transfer |
| F6  | Find Order |
| F7  | Transfer Order |
| F8  | Void Order |
| F9  | Settings |

**Implementation**: `usePOSKeyboardShortcuts()` hook in `/src/hooks/usePOSKeyboardShortcuts.ts`

## 7. Printer Configuration

### Single Printer Setup
- One physical printer for both KOT and bills
- Thermal printer recommended (80mm or 58mm)
- Common model: Zebra, Star Micronics, Epson

### Dual Printer Setup
- Printer 1: KOT (kitchen)
- Printer 2: Receipt/Bill (counter)
- Configure in printer settings page
- Route via `printerService.ts`

**Print Service Configuration**:
```typescript
// In printService.ts
const url = options?.url || 'http://localhost:3001/print';

// For dual setup:
export async function printToKitchenPrinter(html: string) {
  return fetch('http://localhost:3001/print-kitchen', {
    method: 'POST',
    body: JSON.stringify({ html })
  });
}

export async function printToCounterPrinter(html: string) {
  return fetch('http://localhost:3001/print-counter', {
    method: 'POST',
    body: JSON.stringify({ html })
  });
}
```

## 8. Data Model Integration

### Order Status Flow
```
CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED → PAID → CLOSED
```

### Order Item Properties
- `quantity`: Number of items
- `unit_price`: Price per item
- `total_price`: quantity × unit_price
- `notes`: Special instructions
- `item_status`: 'pending' or 'ready' (kitchen tracking)

## 9. Testing Checklist

- [ ] Square button aspect ratio working on desktop/tablet/mobile
- [ ] Payment balance calculation 100% accurate for edge cases
- [ ] "Proceed Payment" button only enabled when received >= total
- [ ] Silent printing works without browser dialog
- [ ] KOT prints correctly with all items
- [ ] Bill prints with prices and totals
- [ ] Bills filter tabs show correct counts
- [ ] Keyboard shortcuts F3-F5 open payment dialog
- [ ] Cart clears after successful payment
- [ ] Toast notifications show correctly
- [ ] Edit KOT functionality loads order properly
- [ ] Reprint KOT and Bill work from dialog

## 10. Performance Optimization

- **Button Click Response**: < 100ms
- **Dialog Open**: < 200ms
- **Print Request**: < 300ms
- **Payment Processing**: < 1s (RPC + printing)
- **Bills List Load**: < 500ms for 50 bills

## 11. Error Handling

### Payment Failures
```typescript
catch (error) {
  toast({
    title: 'Payment Failed',
    description: 'An error occurred while processing payment.',
    variant: 'destructive',
  });
}
```

### Print Failures
```typescript
catch (error) {
  toast({
    title: 'Print Error',
    description: 'Failed to send to printer - check connection',
    variant: 'destructive',
  });
}
```

### Validation Errors
- Insufficient amount: Show toast, keep dialog open
- Invalid amount: Clear field or show toast
- Network error: Retry button or manual entry option
