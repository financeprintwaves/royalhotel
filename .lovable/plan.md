

## AFS Card Terminal Integration

### What This Does
When a cashier clicks "Card" to pay, the bill amount will automatically be sent to your AFS Nexgo card machine so the customer can swipe/tap their card -- no need to manually type the amount on the terminal.

### How It Works

Since the POS runs in a web browser, it cannot talk directly to the AFS terminal at `172.28.28.26:21105`. The solution uses the same **local daemon** pattern already in place for silent printing -- a small local service running on the POS computer that proxies the payment request to the AFS terminal.

```text
Browser (POS)                Local Daemon              AFS Terminal
    |                        (localhost:3001)         (172.28.28.26:21105)
    |-- POST /pay-card ----->|                          |
    |   {amount: 5.500}      |-- HTTPS POST ---------->|
    |                        |   apex.smartpos.gateway  |
    |                        |<-- response -------------|
    |<-- {success, ref} -----|                          |
```

### Changes

#### 1. New file: `src/services/afsTerminalService.ts`
- `sendToAfsTerminal(amount)` -- sends payment amount to the local daemon's `/pay-card` endpoint
- Returns the transaction reference from AFS on success
- 30-second timeout (card swipe may take time)
- Clean error handling with user-friendly messages

#### 2. Update: `src/pages/POS.tsx` (Card payment flow)
- When payment method is "card", call `sendToAfsTerminal(amount)` **before** calling `quickPayOrder`
- Show a loading state ("Waiting for card...") while the terminal processes
- On success: auto-fill the transaction reference from AFS response, then complete payment
- On failure: show error toast, let cashier retry or switch to manual entry

#### 3. Update: `src/pages/Orders.tsx` and `src/pages/NewOrder.tsx`
- Same card payment integration for consistency across all payment entry points

#### 4. Local Daemon Documentation
- Add instructions in a `docs/afs-terminal-setup.md` file explaining:
  - The local daemon needs a `/pay-card` endpoint that forwards to AFS
  - Expected request/response format
  - AFS gateway URL and service path configuration

### Technical Details

**AFS Terminal Service:**
```typescript
// POST to local daemon which proxies to AFS
export async function sendToAfsTerminal(amount: number): Promise<{success: boolean; reference?: string}> {
  const res = await fetch('http://localhost:3001/pay-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, currency: 'OMR' }),
  });
  return res.json();
}
```

**POS Card Payment Flow Update:**
```typescript
// When card is selected:
if (paymentMethod === 'card') {
  setCardProcessing(true);
  const result = await sendToAfsTerminal(paymentTotal);
  if (!result.success) {
    toast({ variant: 'destructive', title: 'Card terminal error' });
    return;
  }
  transactionRef = result.reference;
}
await quickPayOrder(orderId, paymentTotal, 'card');
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/afsTerminalService.ts` | Create -- AFS terminal communication service |
| `src/pages/POS.tsx` | Modify -- integrate AFS call on card payment |
| `src/pages/Orders.tsx` | Modify -- integrate AFS call on card payment |
| `src/pages/NewOrder.tsx` | Modify -- integrate AFS call on card payment |
| `docs/afs-terminal-setup.md` | Create -- setup guide for local daemon AFS proxy |

