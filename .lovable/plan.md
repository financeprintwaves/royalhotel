
## Plan: Date Range Filters, Export Functionality & Cash Drawer Reconciliation

### Overview
Implement three key features to enhance the reporting and end-of-shift management capabilities:
1. **Date Range Filters** - Custom date pickers for flexible report periods
2. **Export Functionality** - CSV and PDF export for all report types
3. **Cash Drawer Reconciliation** - End-of-shift cash counting and verification

---

### Feature 1: Date Range Filters for Reports

**Current State:**
- Reports currently only support preset periods (7, 14, 30 days)
- Uses a simple Tabs component for period selection

**Implementation:**

| Component | Changes |
|-----------|---------|
| Reports.tsx | Add date picker UI with start/end date selection |
| reportingService.ts | Update all functions to accept date range instead of days |
| New DateRangePicker | Reusable component with calendar popovers |

**UI Design:**
- Replace current period tabs with a date range picker
- Include quick presets (Today, Yesterday, Last 7 Days, This Week, This Month, Custom)
- Calendar popover for custom date selection

---

### Feature 2: Export Functionality (CSV & PDF)

**Export Formats:**

| Report Tab | CSV Export | PDF Export |
|------------|------------|------------|
| Overview | Summary metrics | Branded report with charts |
| Sales | Daily/hourly data | Sales trend report |
| Payments | Payment breakdown | Payment summary sheet |
| Items | Full item list | Item sales report |
| Summary | Complete summary | Executive summary PDF |

**Implementation Approach:**
- **CSV**: Generate in-browser using native JavaScript (no library needed)
- **PDF**: Use browser print-to-PDF with a hidden printable template

**New Components:**
- `ExportButtons` - Dropdown with CSV/PDF options
- `PrintableReport` - Hidden component formatted for PDF printing

---

### Feature 3: Cash Drawer Reconciliation

**Purpose:**
Allow cashiers to count their physical cash drawer at end of shift and compare against system totals.

**New Database Table: `cash_drawer_counts`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | uuid | Links to staff_sessions |
| user_id | uuid | Staff member |
| branch_id | uuid | Branch reference |
| expected_cash | numeric | System-calculated cash total |
| counted_cash | numeric | Physically counted amount |
| variance | numeric | Difference (counted - expected) |
| denomination_breakdown | jsonb | Optional: count by bill/coin type |
| notes | text | Explanation for variance |
| counted_at | timestamptz | When count was performed |

**New Components:**

| Component | Purpose |
|-----------|---------|
| CashDrawerDialog | Modal for entering cash count |
| DenominationCounter | Grid for counting bills/coins |
| VarianceAlert | Warning when count doesn't match |

**Denomination Breakdown (OMR):**
- Bills: 50, 20, 10, 5, 1, 0.500
- Coins: 0.200, 0.100, 0.050, 0.025, 0.010, 0.005

**Workflow Integration:**
1. Staff clicks "End Shift" / "Logout"
2. System shows Shift Summary (existing)
3. New "Count Cash Drawer" step before confirmation
4. Staff enters denominations or total amount
5. System calculates variance and displays result
6. Manager approval required if variance exceeds threshold (e.g., 0.500 OMR)
7. Session ends and records are saved

---

### Technical Implementation Steps

**Step 1: Database Migration**
```
Create cash_drawer_counts table with RLS policies:
- Users can insert/view their own counts
- Managers can view all counts in their branch
```

**Step 2: Update Reporting Service**
```
Modify all reporting functions to accept:
- startDate: Date
- endDate: Date
Instead of days: number
```

**Step 3: Reports Page Updates**
- Add DateRangePicker component with Popover + Calendar
- Add Export dropdown with CSV/PDF buttons
- Create PrintableReport component for PDF generation
- Implement CSV generation utility functions

**Step 4: Cash Drawer Feature**
- Create CashDrawerDialog component
- Update LogoutSummaryDialog to include cash counting step
- Create cashDrawerService.ts for database operations
- Update AuthContext logout flow

**Step 5: ShiftReport Enhancement**
- Include cash drawer variance if applicable
- Add denominations breakdown to printed report

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| supabase/migrations/new | Create | cash_drawer_counts table + RLS |
| src/services/reportingService.ts | Modify | Add date range parameters |
| src/services/cashDrawerService.ts | Create | Cash drawer CRUD operations |
| src/pages/Reports.tsx | Modify | Add date picker + export buttons |
| src/components/DateRangePicker.tsx | Create | Reusable date range selector |
| src/components/ExportButtons.tsx | Create | CSV/PDF export dropdown |
| src/components/PrintableReport.tsx | Create | PDF-formatted report template |
| src/components/CashDrawerDialog.tsx | Create | Cash counting interface |
| src/components/LogoutSummaryDialog.tsx | Modify | Add cash counting step |
| src/components/ShiftReport.tsx | Modify | Include variance info |
| src/contexts/AuthContext.tsx | Modify | Update logout flow |

---

### Security Considerations

- Cash drawer counts protected by RLS (users see own, managers see branch)
- Variance threshold configurable per branch
- Audit trail maintained in database
- Manager notification when variance exceeds threshold

---

### Currency Precision

All cash amounts will maintain OMR standard with 3 decimal places for accurate reconciliation.
