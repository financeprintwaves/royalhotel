# POS System - Database & Architecture Guide

## Database Structure

### Core Tables

#### `users` (Auth via Supabase Auth)
- Extends Supabase `auth.users`
- Encrypted passwords
- Social auth support

#### `profiles`
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- branch_id: UUID (FK → branches)
- full_name: TEXT
- role: ENUM ('admin', 'manager', 'cashier', 'waiter', 'chef')
- avatar_url: TEXT
- phone: TEXT
- email: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `branches`
```sql
- id: UUID (PK)
- name: TEXT
- location: TEXT
- address: TEXT
- phone: TEXT
- email: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `categories`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- name: TEXT
- description: TEXT
- icon: TEXT
- display_order: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `menu_items`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- category_id: UUID (FK → categories)
- name: TEXT
- description: TEXT
- price: DECIMAL(10,3)
- image_url: TEXT
- is_available: BOOLEAN
- is_active: BOOLEAN
- session: ENUM ('breakfast', 'lunch', 'dinner', 'all') -- NEW
- is_daily_special: BOOLEAN -- NEW
- is_favorite: BOOLEAN -- NEW
- billing_type: ENUM ('bottle_only', 'by_serving', 'service') -- For bar
- bottle_size_ml: INTEGER
- cost_price: DECIMAL(10,3)
- serving_size_ml: INTEGER
- serving_price: DECIMAL(10,3)
- portion_options: JSONB -- [{name, priceMultiplier}]
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `tables`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- table_number: TEXT
- capacity: INTEGER
- status: ENUM ('available', 'occupied', 'reserved', 'dirty')
- location: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `orders`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- table_id: UUID (FK → tables) -- NULL for takeout/delivery
- order_number: TEXT (UNIQUE per branch)
- customer_name: TEXT
- order_type: ENUM ('dine-in', 'take-out', 'delivery')
- order_status: ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED')
- subtotal: DECIMAL(10,3)
- discount_amount: DECIMAL(10,3)
- discount_percent: DECIMAL(5,2)
- tax_amount: DECIMAL(10,3)
- tax_percent: DECIMAL(5,2)
- total_amount: DECIMAL(10,3)
- payment_method: ENUM ('cash', 'card', 'online', 'pending')
- payment_status: ENUM ('unpaid', 'partial', 'paid')
- is_foc: BOOLEAN -- Free of Charge
- foc_reason: TEXT
- foc_dancer_name: TEXT
- notes: TEXT
- created_by: UUID (FK → profiles)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- paid_at: TIMESTAMPTZ
```

#### `order_items`
```sql
- id: UUID (PK)
- order_id: UUID (FK → orders)
- menu_item_id: UUID (FK → menu_items)
- quantity: INTEGER
- unit_price: DECIMAL(10,3)
- item_subtotal: DECIMAL(10,3)
- item_status: ENUM ('pending', 'preparing', 'ready', 'served')
- is_serving: BOOLEAN -- For bottle quantity tracking
- portion_name: TEXT -- e.g., "Medium", "Large"
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `payments`
```sql
- id: UUID (PK)
- order_id: UUID (FK → orders)
- branch_id: UUID (FK → branches)
- payment_method: ENUM ('cash', 'card', 'online')
- amount: DECIMAL(10,3)
- payment_date: TIMESTAMPTZ
- reference: TEXT -- Transaction ID if card/online
- status: ENUM ('success', 'pending', 'failed', 'refunded')
- notes: TEXT
- processed_by: UUID (FK → profiles)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `expenses` -- NEW
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- category: TEXT
- description: TEXT
- amount: DECIMAL(10,3)
- expense_date: DATE
- recorded_by: UUID (FK → profiles)
- receipt_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `printers`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- name: TEXT
- type: ENUM ('bill', 'kot', 'label')
- printer_model: TEXT
- ip_address: TEXT
- port: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `inventory`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- menu_item_id: UUID (FK → menu_items)
- quantity: DECIMAL(10,3)
- unit: TEXT -- 'pieces', 'liters', 'kg'
- reorder_level: DECIMAL(10,3)
- last_updated: TIMESTAMPTZ
```

#### `reservations`
```sql
- id: UUID (PK)
- branch_id: UUID (FK → branches)
- table_id: UUID (FK → tables)
- customer_name: TEXT
- customer_phone: TEXT
- reservation_date: DATE
- reservation_time: TIME
- party_size: INTEGER
- notes: TEXT
- status: ENUM ('confirmed', 'cancelled', 'completed')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## Key Services

### authService.ts
```typescript
- handleAuthStateChange(callback)
- getCurrentUser()
- login(email, password)
- signup(email, password, fullName)
- logout()
- resetPassword(email)
```

### menuService.ts
```typescript
- getCategories(branchId?)
- getMenuItems(categoryId?, branchId?, options?)
  - options: { session?, onlyDailySpecial?, onlyFavorites? }
- createMenuItemForBranch(options)
- updateMenuItemWithPortions(itemId, updates)
- deleteMenuItem(itemId)
```

### orderService.ts
```typescript
- createOrder(data)
- addOrderItemsBatch(orderId, items)
- sendToKitchen(orderId)
- updateOrderItemStatus(itemId, status)
- markAsServed(orderId)
- quickPayOrder(orderId, method)
- getOrders(filters)
- getKitchenOrders()
```

### tableService.ts
```typescript
- getTables(branchId?)
- updateTableStatus(tableId, status)
- mergeTables(sourceId, targetIds)
- splitTables(sourceId, newTableCount)
- getAvailableTables(capacity?, branchId?)
```

### paymentService.ts
```typescript
- processCashPayment(orderId, amount)
- processCardPayment(orderId, amount, card)
- processOnlinePayment(orderId, amount, method)
- generatePaymentReference(orderId)
- refundPayment(paymentId)
```

### printerService.ts
```typescript
- printKOT(order)
- printInvoice(order)
- getPrinters(branchId?)
- testPrinter(printerId)
```

### expenseService.ts -- NEW
```typescript
- getExpenses(branchId?)
- createExpense(options)
- updateExpense(expenseId, updates)
- deleteExpense(expenseId)
- getExpenseSummary(dateFrom, dateTo, branchId?)
```

### cacheService.ts
```typescript
- localCache: Browser-based cache
- CACHE_KEYS: Predefined cache keys
- CACHE_DURATION: 10 minutes default
```

---

## State Management Flow

```
AuthContext (Global)
├── useAuth() hook
├── user profile
├── roles
└── branch_id

Local Component State
├── cart items
├── held bills (localStorage)
├── current order
└── UI modals

Supabase Realtime
├── Orders subscription
├── Kitchen orders subscription
└── Table status subscription
```

---

## API Request Flow

```
User Action
   ↓
React Component
   ↓
Service Function
   ↓
Supabase Client
   ↓
PostgreSQL Database
   ↓
RLS Policies (Permission Check)
   ↓
Return Data
   ↓
Update Component State
   ↓
Re-render UI
```

---

## Row Level Security (RLS) Policies

### All tables follow these patterns:

**SELECT**: Users can see data from their branch
```sql
branch_id IN (SELECT branch_id FROM profiles WHERE user_id = auth.uid())
```

**INSERT**: Only managers/admins can create
```sql
public.is_manager_or_admin(auth.uid())
AND branch_id IN (SELECT branch_id FROM profiles WHERE user_id = auth.uid())
```

**UPDATE**: Only admins can modify
```sql
public.is_admin(auth.uid())
```

**DELETE**: Only admins can delete
```sql
public.is_admin(auth.uid())
```

---

## Performance Optimizations

### 1. **Query Caching**
- React Query: 10 min stale time
- Browser IndexedDB: Menu items, categories
- localStorage: Held bills, cart draft

### 2. **Lazy Loading**
- Images: Thumbnail → full size
- Reports: Paginated queries
- Kitchen Display: Incoming orders only

### 3. **Real-time Subscriptions**
- Order status: Supabase wss://
- Kitchen orders: Filtered by kitchen staff
- Only active orders subscribed

### 4. **Batch Operations**
- Multiple items in single insert
- Bulk order status updates
- Combined payment processing

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Proceed normally |
| 400 | Invalid input | Show validation error |
| 401 | Not authenticated | Redirect to login |
| 403 | Not authorized | Show permission error |
| 409 | Conflict (duplicate) | Retry or merge |
| 500 | Server error | Show toast, retry |

### Network Retry Strategy
```
1st attempt: Immediate
2nd attempt: After 2s
3rd attempt: After 5s
Give up: Show offline indicator
```

---

## Adding New Features

### Example: Add a new menu item field

1. **Database Migration**
```sql
ALTER TABLE menu_items ADD COLUMN new_field TEXT;
```

2. **Update Types**
```typescript
// types/pos.ts
export interface MenuItem {
  new_field?: string;
}
```

3. **Update Service**
```typescript
// services/menuService.ts
export async function getMenuItems(...) {
  // Query includes new_field
}
```

4. **Update UI Component**
```typescript
// Example in MenuManagement.tsx
<Input 
  value={itemNewField} 
  onChange={(e) => setItemNewField(e.target.value)}
/>
```

5. **Test**
- Build: `npm run build`
- Test: `npm run dev`
- Verify database migration applied

---

## Performance Monitoring

### Key Metrics to Track

- **Time to First Paint (TFP)**: < 2 seconds
- **Database Query Time**: < 500ms
- **Keyboard Input Lag**: < 100ms
- **Print Job Time**: < 3 seconds
- **KOT Delivery**: < 5 seconds

### Debug Mode
```typescript
// In Chrome DevTools Console
localStorage.setItem('debug', 'true');
```

---

## Deployment Checklist

- [ ] Run migrations: `supabase db push`
- [ ] Build project: `npm run build`
- [ ] Run tests: `npm run test`
- [ ] Check build size: < 1.5MB gzipped
- [ ] Verify RLS policies
- [ ] Test offline mode
- [ ] Check print setup
- [ ] Validate keyboard shortcuts
- [ ] Load test with 50+ concurrent users

---

## Troubleshooting

### Issue: Kitchen orders not showing
**Solution**: Check Supabase subscription, verify staff role, check kitchen filter

### Issue: Held bills not persisting
**Solution**: Check localStorage limits, clear cache, verify branch_id

### Issue: Items not filtering by session
**Solution**: Verify menu_items.session is set, reload menu cache

### Issue: Print not working
**Solution**: Check printer IP/port, test from Settings, verify paper loaded

---

**Architecture Version**: 2.0  
**Last Updated**: April 1, 2026  
**Maintainer**: Development Team
