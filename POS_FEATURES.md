# Royal Hotel POS - Advanced Feature Documentation

## Overview

This document outlines all the advanced features implemented in the Royal Hotel Restaurant POS system. The system is designed to be a modern, touch-friendly point-of-sale solution optimized for tablets and desktop use.

---

## 🎯 Core Features

### 1. **Menu Session Management (Breakfast/Lunch/Dinner)**
- **Purpose**: Streamline billing by showing only relevant menu items based on the time of day
- **How to Use**:
  - In POS dashboard, select session buttons at top: "All Sessions", "Breakfast", "Lunch", "Dinner"
  - Menu automatically filters to show only items for that session
  - Admin can assign items to specific sessions in Menu Management
- **Admin Configuration**: Menu → Edit Item → Session dropdown
- **Keyboard Shortcut**: None (use button selection)

### 2. **Daily Specials Panel**
- **Purpose**: Highlight and fast-track special dishes of the day
- **Features**:
  - Separate "Today Specials" section in POS with orange badge
  - One-click ordering for special items
  - Admin can mark items as daily specials
- **Admin Configuration**: Menu → Edit Item → Toggle "Daily Special"
- **Quick Access**: Front-of-house POS shows special items in prominent position

### 3. **Favorite Items**
- **Purpose**: Quick access to frequently ordered items
- **Features**:
  - Green "Favorites" section in POS
  - Quick buttons for popular items
  - Helps staff upsell common items
- **Admin Configuration**: Menu → Edit Item → Toggle "Favorite"

### 4. **Quick Quantity Buttons**
- **Purpose**: Speed up ordering with preset quantities
- **How to Use**:
  - Buttons show: ×1, ×2, ×3, ×5
  - Click button, then select item to add that quantity directly
  - Useful for combo orders
- **Location**: POS center panel, menu selection area

---

## ⚡ Fast Billing Features

### 5. **Keyboard Shortcuts for Super-Fast Billing**

| Key | Action | Description |
|-----|--------|-------------|
| **F1** | New Bill | Clear current order and start fresh |
| **F2** | Search Item | Focus search bar to quickly find items |
| **F3** | Hold Bill | Save current bill for later recall |
| **F4** | Recall Bill | View and restore held bills |
| **F5** | Print Bill | Print customer receipt |
| **F6** | Print KOT | Print kitchen order ticket |
| **F7** | Quick Pay (Cash) | Finalize order with cash payment |
| **F8** | Quick Pay (Card) | Finalize order with card payment |
| **F9** | Split Bill | Open split billing dialog |

### 6. **Hold & Recall Bills**
- **Purpose**: Temporarily save orders for later completion
- **How to Use**:
  1. Build order as normal
  2. Press F3 or click "Hold Bill" button
  3. Bill is saved with timestamp
  4. Press F4 or "Recall Bill" to restore
  5. Max 20 held bills per branch
- **Persistence**: Held bills stored in browser local storage
- **Display**: Compact list showing bill name and item count

### 7. **Repeat Last Order**
- **Purpose**: Quickly duplicate the previous customer's order
- **How to Use**:
  1. Complete and pay a previous order
  2. Click "Repeat Last Order" button
  3. Previous order items are loaded into cart
  4. Modify as needed and checkout
- **Data Source**: Most recent PAID order in database

### 8. **Quick Add Quantity Feature**
- **Purpose**: Add multiple quantities without repeated clicks
- **How to Use**:
  1. Select desired quantity (1, 2, 3, 5) from buttons
  2. Click item to add
  3. Item added with selected quantity
  4. Reset button returns to quantity 1

---

## 🍽️ Order Management

### 9. **Table Management & Merging**
- **Purpose**: Manage dining in orders by table
- **Features**:
  - Visual table status indicators (available, occupied, reserved)
  - Table selection with order persistence
  - Merge multiple tables into one
- **Merge Mode**:
  1. Click "Merge Tables" button
  2. Select source table (appears as highlight)
  3. Select target table
  4. Orders combined into one table

### 10. **Table Transfer**
- **Purpose**: Move an order from one table to another
- **How to Use**:
  1. Select order for table
  2. In billing panel, use "Transfer table" dropdown
  3. Select new table
  4. Order moves automatically

### 11. **Order Types**
- **Dine In**: Seated customer, kitchen meal
- **Take Out**: Prepared order for pickup
- **Delivery**: Order for delivery address
- **Selection**: Radio buttons in POS, switches automatically

---

## 💳 Payment Features

### 12. **Split Bill Manager**
- **Purpose**: Divide check between multiple customers
- **Methods**:
  - **Equal Split**: Automatically divide by number of people
  - **Manual Split**: Custom amounts per person
- **How to Use**:
  1. Press F9 or click Split Bill button
  2. Select split method
  3. Set number of people
  4. Create splits or manually assign items
  5. Review totals
  6. Confirm split creates separate payments
- **Item Distribution**: Drag/move items between splits

### 13. **Payment Methods**
- **Cash**: Direct cash payment
- **Card**: Credit/debit card payment
- **Online**: Digital payment (Stripe/PayPal ready)
- **Quick Pay**: F7/F8 shortcuts for instant checkout

---

## 📊 Reporting & Analytics

### 14. **Daily Sales Report**
- Location: Dashboard → Reports
- Shows:
  - Daily revenue trends
  - Order count by service type
  - Hourly breakdown
  - Category-wise sales
  - Item-wise popularity

### 15. **Expense Tracking**
- Location: Dashboard → Expenses
- Categories: Food, Utilities, Salaries, Rent, etc.
- Features:
  - Date range filtering
  - Category breakdown
  - Export to CSV/JSON
  - Summary cards (today, this week, this month)

---

## 🖥️ Kitchen Display System (KDO/KDS)

### 16. **Kitchen Display Screen**
- Location: Dashboard → Kitchen
- Features:
  - Real-time order notifications
  - Color-coded urgency (green/yellow/red)
  - Item status tracking (pending/ready/served)
  - Order age timer
  - Audio/visual alerts for new orders
  - Print KOT functionality

### 17. **Order Timer**
- **Purpose**: Track how long order has been in kitchen
- **Display**: Shows elapsed time (e.g., "3m 45s")
- **Color Coding**:
  - 🟢 Green: Within target time
  - 🟡 Yellow: Approaching target (70%+ of time)
  - 🟠 Orange: Over target time
  - 🔴 Red: Way over target (150%+ of time)
- **Pulse Animation**: "LATE" badge pulses when overdue

### 18. **Order Status Management**
- Statuses: Pending → Preparing → Ready → Served
- Staff can mark items as:
  - **Ready**: Item is prepared
  - **Served**: Customer has received
- Batch actions available for speed

---

## 📱 Customer Display

### 19. **Customer Display Screen**
- **Purpose**: Public display of order status for customers
- **Access**: `/display/order/:orderId` (opens in new window)
- **Shows**:
  - Current order status with icon
  - Item grid with images
  - Order number and elapsed time
  - Bill summary (subtotal, tax, discount, total)
  - Status message ("Preparing", "Ready for pickup", etc.)
  - Emoji indicators for clear messaging
- **Deployment**: Display on 21-27" monitor at front counter
- **Theme**: Dark mode, readable from distance

---

## 🔧 Item Customization

### 20. **Item Modifiers**
- **Purpose**: Allow customization of items (e.g., size, flavor, extras)
- **Types**:
  - **Single Select**: Radio button (e.g., Size: Small/Medium/Large)
  - **Multiple Select**: Checkboxes (e.g., Extras: Extra cheese, bacon, etc.)
- **Price Adjustments**: Modifiers can add to item price
- **Required Modifiers**: Force selection before adding to cart
- **Future Implementation**: Database tables ready, UI pending
- **Usage**: Will integrate into item selection dialog

### 21. **Combo Meals**
- **Purpose**: Bundle related items at special price
- **Features**:
  - Predefined item combinations
  - Discounted pricing vs. individual items
  - Quick selection interface
  - Visual item preview
- **Future Implementation**: UI selector ready, admin configuration pending

---

## 📲 Digital Ordering

### 22. **QR Menu Display**
- **Purpose**: Customer self-service menu viewing
- **Features**:
  - Generate unique QR codes per table
  - Download QR codes for printing
  - Share links via messaging
  - Mobile-responsive menu viewing
- **How to Use**:
  1. Click "Menu QR" button in POS
  2. Download or print QR code
  3. Place on tables
  4. Customers scan with phone to view menu
- **URL Structure**: `/menu?table=1&order=abc123`

---

## 🔐 User Management

### 23. **User Roles**
- **Admin**: Full access, system configuration
- **Manager**: Reports, staff, menu management
- **Cashier**: POS, orders, payments
- **Waiter**: Table management, orders
- **Restrictions**: RLS (Row Level Security) enforced at database level

### 24. **Multi-Branch Support**
- **Purpose**: Manage multiple restaurant locations
- **Features**:
  - Branch selection in dashboard
  - Branch-specific data isolation
  - Staff assigned to branches
  - Inventory per branch
- **Admin Only**: Branch management and creation

---

## 💾 Offline & Sync Mode

### 25. **Offline Capability**
- **Purpose**: Continue operations during internet outage
- **Features**:
  - Cart saved to browser IndexedDB
  - Held bills persisted locally
  - Menu cached for offline browsing
  - Automatic sync when online
- **Detection**: WiFi icon shows connection status
- **Sync**: Automatic when connection restored

---

## 🖨️ Printing

### 26. **Multiple Printer Support**
- **Purpose**: Print to different printers (billing vs. kitchen)
- **Configuration**: Settings → Printer Settings
- **Options**:
  - Bill Printer: Receipt format
  - KOT Printer: Kitchen order ticket format
  - Thermal Printer: 80mm width support
- **Format**: Configurable from admin panel

### 27. **Printable Documents**
- **Invoice/Bill**: Customer receipt format
- **KOT**: Kitchen Order Ticket with item details
- **Reports**: Daily sales, expense summaries
- **Preview**: Print preview before sending to printer

---

## 📈 Inventory Management

### 28. **Inventory Deduction**
- **Purpose**: Auto-reduce stock when items sold
- **Features**:
  - Track stock by unit (pieces, liters, kg)
  - Low stock alerts
  - Reorder reminders
  - Bulk adjustment interface
- **Location**: Dashboard → Inventory

### 29. **Stock Level Alerts**
- Badge on inventory icon when stock low
- Email/notification alerts to managers
- Prevent selling out-of-stock items
- Forecasting based on sales velocity

---

## 🎨 UI/UX Features

### 30. **Touch-Friendly Design**
- Large buttons for finger tapping
- Rounded corners, soft shadows
- High contrast for readability
- Responsive layout (tablet & desktop)
- Landscape mode optimization

### 31. **Colorful Category Buttons**
- Each category has distinct color
- Visual hierarchy with size gradients
- Favorite categories pinned to top
- Search functionality

### 32. **Dark Mode Option**
- POS optimized for kitchens (dark screens)
- Reduced eye strain for extended use
- Toggle in settings
- Preserves selection

---

## 🔊 Notifications

### 33. **Audio Alerts**
- New order notification sound
- Ready for pickup alert
- Payment received confirmation
- Customizable volume levels
- Mute option available

### 34. **Visual Notifications**
- Toast messages for actions
- Badge counters for orders
- Status indicators (blinking lights)
- Color-coded urgency levels

---

## 📚 Getting Started

### Admin Setup Checklist
- [ ] Create menu categories
- [ ] Add menu items with prices
- [ ] Assign items to sessions (breakfast/lunch/dinner)
- [ ] Configure daily specials
- [ ] Set up user accounts and roles
- [ ] Configure printers
- [ ] Add tables for dine-in
- [ ] Set branch locations
- [ ] Configure payment methods
- [ ] Train staff on keyboard shortcuts

### POS User Quick Start
1. Log in → Select branch → Select table or create new order
2. Choose session (Breakfast/Lunch/Dinner)
3. Browse categories → Select items → Adjust quantities
4. Add notes if needed
5. Send to kitchen (KOT)
6. Monitor preparation in Kitchen Display
7. Complete payment
8. Print receipt

---

## 🚀 Keyboard Shortcuts Cheat Sheet

```
F1  → New Bill
F2  → Search
F3  → Hold Bill
F4  → Recall Bill
F5  → Print Bill
F6  → Send to Kitchen
F7  → Cash Payment
F8  → Card Payment
F9  → Split Bill
```

---

## 🔮 Future Enhancements

- Loyalty program integration
- Table reservation system improvements
- Advanced combo meal builder
- Staff performance analytics
- Customer feedback system
- Integration with third-party platforms
- AI-powered demand forecasting
- Mobile app for staff

---

## 📞 Support & Documentation

For more information or to report issues:
- Check the README.md in project root
- Review Supabase migrations for database structure
- Consult component documentation in source code

---

**Last Updated**: April 1, 2026  
**System Version**: 1.0.0  
**Tech Stack**: React, TypeScript, Tailwind, Supabase
