import { forwardRef } from "react";
import { format } from "date-fns";
import { SessionSummary } from "@/services/sessionService";
import { CashDrawerCount, OMR_DENOMINATIONS } from "@/services/cashDrawerService";

interface ShiftReportProps {
  summary: SessionSummary;
  businessName?: string;
  cashDrawerCount?: CashDrawerCount | null;
}

const ShiftReport = forwardRef<HTMLDivElement, ShiftReportProps>(
  ({ summary, businessName = "Restaurant POS", cashDrawerCount }, ref) => {
    const formatCurrency = (amount: number) => `OMR ${amount.toFixed(3)}`;

    const getDuration = () => {
      const diff = summary.logoutTime.getTime() - summary.loginTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    // Get denomination label by value
    const getDenominationLabel = (value: string) => {
      const numValue = parseFloat(value);
      const allDenoms = [...OMR_DENOMINATIONS.bills, ...OMR_DENOMINATIONS.coins];
      return allDenoms.find(d => d.value === numValue)?.label || value;
    };

    return (
      <div
        ref={ref}
        className="p-4 font-mono text-sm print:bg-white print:text-black"
        style={{ width: "300px", backgroundColor: "#fff", color: "#000" }}
      >
        {/* Header */}
        <div className="text-center pb-3 mb-3" style={{ borderBottom: "1px dashed #999" }}>
          <div className="text-lg font-bold">{businessName}</div>
          <div className="text-base font-semibold mt-1">SHIFT REPORT</div>
        </div>

        {/* Staff & Time Info */}
        <div className="space-y-1 pb-3 mb-3" style={{ borderBottom: "1px dashed #999" }}>
          <div className="flex justify-between">
            <span>Staff:</span>
            <span className="font-semibold">{summary.userName}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(summary.loginTime, "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span>Login:</span>
            <span>{format(summary.loginTime, "hh:mm a")}</span>
          </div>
          <div className="flex justify-between">
            <span>Logout:</span>
            <span>{format(summary.logoutTime, "hh:mm a")}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{getDuration()}</span>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="pb-3 mb-3" style={{ borderBottom: "1px dashed #999" }}>
          <div className="font-semibold mb-2">PAYMENT SUMMARY</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Cash:</span>
              <span>{formatCurrency(summary.cashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card:</span>
              <span>{formatCurrency(summary.cardTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mobile:</span>
              <span>{formatCurrency(summary.mobileTotal)}</span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between text-base font-bold pb-3 mb-3" style={{ borderBottom: "1px dashed #999" }}>
          <span>TOTAL:</span>
          <span>{formatCurrency(summary.totalAmount)}</span>
        </div>

        {/* Cash Drawer Reconciliation */}
        {cashDrawerCount && (
          <div className="pb-3 mb-3" style={{ borderBottom: "1px dashed #999" }}>
            <div className="font-semibold mb-2">CASH DRAWER COUNT</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Expected:</span>
                <span>{formatCurrency(cashDrawerCount.expected_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Counted:</span>
                <span>{formatCurrency(cashDrawerCount.counted_cash)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Variance:</span>
                <span>{cashDrawerCount.variance >= 0 ? "+" : ""}{formatCurrency(cashDrawerCount.variance)}</span>
              </div>
              {cashDrawerCount.notes && (
                <div className="mt-2 text-xs" style={{ color: "#666" }}>
                  <span>Notes: {cashDrawerCount.notes}</span>
                </div>
              )}
            </div>

            {/* Denomination Breakdown */}
            {cashDrawerCount.denomination_breakdown && Object.keys(cashDrawerCount.denomination_breakdown).length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold mb-1">DENOMINATION BREAKDOWN</div>
                <div className="space-y-0.5 text-xs">
                  {Object.entries(cashDrawerCount.denomination_breakdown)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                    .map(([denom, count]) => (
                      <div key={denom} className="flex justify-between">
                        <span>{getDenominationLabel(denom)} x {count}</span>
                        <span>{formatCurrency(parseFloat(denom) * count)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs" style={{ color: "#666" }}>
          <div>End of Shift Report</div>
          <div className="mt-1">
            {format(new Date(), "MMM dd, yyyy hh:mm a")}
          </div>
        </div>
      </div>
    );
  }
);

ShiftReport.displayName = "ShiftReport";

export default ShiftReport;
