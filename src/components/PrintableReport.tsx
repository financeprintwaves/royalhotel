import { forwardRef } from "react";
import { format } from "date-fns";
import type { DateRange } from "./DateRangePicker";
import type { 
  DailySales, 
  HourlySales, 
  TopSellingItem, 
  PaymentBreakdown, 
  CategorySales,
  StaffPerformance,
  OrderTypeSales,
  ItemSalesDetail,
  SalesSummary
} from "@/services/reportingService";

export interface PrintableReportData {
  dailySales: DailySales[];
  hourlySales: HourlySales[];
  topItems: TopSellingItem[];
  categorySales: CategorySales[];
  staffPerformance: StaffPerformance[];
  paymentBreakdown: PaymentBreakdown[];
  orderTypeSales: OrderTypeSales[];
  itemSalesDetails: ItemSalesDetail[];
  salesSummary: SalesSummary;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  peakHour: number;
}

interface PrintableReportProps {
  data: PrintableReportData;
  dateRange: DateRange;
  activeTab: string;
  businessName?: string;
}

const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
  ({ data, dateRange, activeTab, businessName = "Restaurant POS" }, ref) => {
    const formatCurrency = (amount: number) => `${amount.toFixed(3)} OMR`;
    
    const formatHour = (hour: number) => {
      if (hour === 0) return "12 AM";
      if (hour === 12) return "12 PM";
      return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    };

    return (
      <div
        ref={ref}
        className="p-8 font-sans text-sm print:bg-white print:text-black"
        style={{ 
          width: "210mm", 
          minHeight: "297mm",
          backgroundColor: "#fff", 
          color: "#000",
          fontFamily: "Arial, sans-serif"
        }}
      >
        {/* Header */}
        <div className="text-center pb-4 mb-4" style={{ borderBottom: "2px solid #333" }}>
          <h1 className="text-2xl font-bold">{businessName}</h1>
          <h2 className="text-lg font-semibold mt-2 capitalize">
            {activeTab === "overview" ? "Overview" : activeTab} Report
          </h2>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
          </p>
          <p className="text-xs mt-1" style={{ color: "#999" }}>
            Generated: {format(new Date(), "MMM dd, yyyy hh:mm a")}
          </p>
        </div>

        {/* Overview / Summary Content */}
        {(activeTab === "overview" || activeTab === "summary") && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded" style={{ border: "1px solid #ddd" }}>
                <p className="text-xs" style={{ color: "#666" }}>Total Revenue</p>
                <p className="text-lg font-bold">{formatCurrency(data.salesSummary.gross_revenue)}</p>
              </div>
              <div className="p-3 rounded" style={{ border: "1px solid #ddd" }}>
                <p className="text-xs" style={{ color: "#666" }}>Total Orders</p>
                <p className="text-lg font-bold">{data.salesSummary.total_orders}</p>
              </div>
              <div className="p-3 rounded" style={{ border: "1px solid #ddd" }}>
                <p className="text-xs" style={{ color: "#666" }}>Avg Order Value</p>
                <p className="text-lg font-bold">{formatCurrency(data.salesSummary.avg_order_value)}</p>
              </div>
              <div className="p-3 rounded" style={{ border: "1px solid #ddd" }}>
                <p className="text-xs" style={{ color: "#666" }}>Peak Hour</p>
                <p className="text-lg font-bold">{formatHour(data.salesSummary.peak_hour)}</p>
              </div>
            </div>

            {/* Order Type Summary */}
            <div className="mb-6">
              <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Order Type Breakdown</h3>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th className="text-left p-2" style={{ border: "1px solid #ddd" }}>Type</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Orders</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2" style={{ border: "1px solid #ddd" }}>Dine-In</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{data.salesSummary.dine_in_orders}</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(data.salesSummary.dine_in_revenue)}</td>
                  </tr>
                  <tr>
                    <td className="p-2" style={{ border: "1px solid #ddd" }}>Takeaway</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{data.salesSummary.takeaway_orders}</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(data.salesSummary.takeaway_revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Summary */}
            <div className="mb-6">
              <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Payment Method Summary</h3>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th className="text-left p-2" style={{ border: "1px solid #ddd" }}>Method</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Transactions</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentBreakdown.map((payment) => (
                    <tr key={payment.method}>
                      <td className="p-2 capitalize" style={{ border: "1px solid #ddd" }}>{payment.method}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{payment.count}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Sales Content */}
        {activeTab === "sales" && (
          <>
            {/* Daily Sales */}
            <div className="mb-6">
              <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Daily Sales</h3>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th className="text-left p-2" style={{ border: "1px solid #ddd" }}>Date</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Orders</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailySales.map((day) => (
                    <tr key={day.date}>
                      <td className="p-2" style={{ border: "1px solid #ddd" }}>{format(new Date(day.date), "MMM dd, yyyy")}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{day.orders}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(day.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                    <td className="p-2" style={{ border: "1px solid #ddd" }}>Total</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{data.dailySales.reduce((s, d) => s + d.orders, 0)}</td>
                    <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(data.dailySales.reduce((s, d) => s + d.revenue, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Category Sales */}
            <div className="mb-6">
              <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Category Sales</h3>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th className="text-left p-2" style={{ border: "1px solid #ddd" }}>Category</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Quantity</th>
                    <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categorySales.map((cat) => (
                    <tr key={cat.category}>
                      <td className="p-2" style={{ border: "1px solid #ddd" }}>{cat.category}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{cat.quantity}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(cat.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Payments Content */}
        {activeTab === "payments" && (
          <div className="mb-6">
            <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Payment Method Breakdown</h3>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th className="text-left p-2" style={{ border: "1px solid #ddd" }}>Method</th>
                  <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Transactions</th>
                  <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>Amount</th>
                  <th className="text-right p-2" style={{ border: "1px solid #ddd" }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentBreakdown.map((payment) => {
                  const total = data.paymentBreakdown.reduce((s, p) => s + p.amount, 0);
                  const percentage = total > 0 ? (payment.amount / total) * 100 : 0;
                  return (
                    <tr key={payment.method}>
                      <td className="p-2 capitalize" style={{ border: "1px solid #ddd" }}>{payment.method}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{payment.count}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(payment.amount)}</td>
                      <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{percentage.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  <td className="p-2" style={{ border: "1px solid #ddd" }}>Total</td>
                  <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{data.paymentBreakdown.reduce((s, p) => s + p.count, 0)}</td>
                  <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>{formatCurrency(data.paymentBreakdown.reduce((s, p) => s + p.amount, 0))}</td>
                  <td className="text-right p-2" style={{ border: "1px solid #ddd" }}>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Items Content */}
        {activeTab === "items" && (
          <div className="mb-6">
            <h3 className="font-bold mb-2" style={{ borderBottom: "1px solid #333" }}>Item Sales Report</h3>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th className="text-left p-1" style={{ border: "1px solid #ddd" }}>#</th>
                  <th className="text-left p-1" style={{ border: "1px solid #ddd" }}>Item</th>
                  <th className="text-left p-1" style={{ border: "1px solid #ddd" }}>Category</th>
                  <th className="text-right p-1" style={{ border: "1px solid #ddd" }}>Qty</th>
                  <th className="text-right p-1" style={{ border: "1px solid #ddd" }}>Avg Price</th>
                  <th className="text-right p-1" style={{ border: "1px solid #ddd" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.itemSalesDetails.map((item, idx) => (
                  <tr key={item.name}>
                    <td className="p-1" style={{ border: "1px solid #ddd" }}>{idx + 1}</td>
                    <td className="p-1" style={{ border: "1px solid #ddd" }}>{item.name}</td>
                    <td className="p-1" style={{ border: "1px solid #ddd" }}>{item.category}</td>
                    <td className="text-right p-1" style={{ border: "1px solid #ddd" }}>{item.quantity}</td>
                    <td className="text-right p-1" style={{ border: "1px solid #ddd" }}>{formatCurrency(item.avg_price)}</td>
                    <td className="text-right p-1" style={{ border: "1px solid #ddd" }}>{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  <td className="p-1" style={{ border: "1px solid #ddd" }} colSpan={3}>Total</td>
                  <td className="text-right p-1" style={{ border: "1px solid #ddd" }}>{data.itemSalesDetails.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="p-1" style={{ border: "1px solid #ddd" }}>-</td>
                  <td className="text-right p-1" style={{ border: "1px solid #ddd" }}>{formatCurrency(data.itemSalesDetails.reduce((s, i) => s + i.revenue, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 text-center text-xs" style={{ borderTop: "1px solid #999", color: "#666" }}>
          <p>End of Report</p>
          <p className="mt-1">{businessName} - POS System</p>
        </div>
      </div>
    );
  }
);

PrintableReport.displayName = "PrintableReport";

export default PrintableReport;
