import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, LogOut, Clock, Wallet, CreditCard, Smartphone, Calculator } from "lucide-react";
import { SessionSummary } from "@/services/sessionService";
import ShiftReport from "./ShiftReport";
import CashDrawerDialog from "./CashDrawerDialog";
import { useReactToPrint } from "react-to-print";
import { 
  saveCashDrawerCount, 
  DenominationBreakdown,
  type CashDrawerCount 
} from "@/services/cashDrawerService";
import { useAuth } from "@/contexts/AuthContext";

interface LogoutSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: SessionSummary | null;
  onConfirmLogout: () => void;
  isLoading?: boolean;
}

const LogoutSummaryDialog = ({
  open,
  onOpenChange,
  summary,
  onConfirmLogout,
  isLoading = false,
}: LogoutSummaryDialogProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [cashCount, setCashCount] = useState<CashDrawerCount | null>(null);
  const [isSavingCount, setIsSavingCount] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Shift-Report-${summary?.userName}-${format(new Date(), "yyyy-MM-dd")}`,
  });

  if (!summary) return null;

  const formatCurrency = (amount: number) => `OMR ${amount.toFixed(3)}`;

  const getDuration = () => {
    const diff = summary.logoutTime.getTime() - summary.loginTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleCashCountSubmit = async (
    countedCash: number,
    breakdown: DenominationBreakdown | null,
    notes: string
  ) => {
    if (!profile?.branch_id) return;
    
    setIsSavingCount(true);
    try {
      const result = await saveCashDrawerCount({
        sessionId: summary.sessionId,
        userId: profile.user_id,
        branchId: profile.branch_id,
        expectedCash: summary.cashTotal,
        countedCash,
        denominationBreakdown: breakdown || undefined,
        notes: notes || undefined,
      });
      
      if (result) {
        setCashCount(result);
      }
    } finally {
      setIsSavingCount(false);
      setShowCashDrawer(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Shift Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Staff Info */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Staff</span>
                <span className="font-semibold">{summary.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Login</span>
                <span>{format(summary.loginTime, "hh:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logout</span>
                <span>{format(summary.logoutTime, "hh:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{getDuration()}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <span>Cash Payments</span>
                </div>
                <span className="font-semibold">{formatCurrency(summary.cashTotal)}</span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <CreditCard className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <span>Card Payments</span>
                </div>
                <span className="font-semibold">{formatCurrency(summary.cardTotal)}</span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-full">
                    <Smartphone className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Mobile Payments</span>
                </div>
                <span className="font-semibold">{formatCurrency(summary.mobileTotal)}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-bold text-xl">{formatCurrency(summary.totalAmount)}</span>
              </div>
            </div>

            {/* Cash Drawer Count Result */}
            {cashCount && (
              <div className={`p-4 rounded-lg border-2 ${
                cashCount.variance === 0 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                  : Math.abs(cashCount.variance) > 0.5 
                    ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" 
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Cash Drawer Verified</span>
                  <Calculator className="h-4 w-4" />
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected:</span>
                    <span>{formatCurrency(cashCount.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Counted:</span>
                    <span>{formatCurrency(cashCount.counted_cash)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t">
                    <span>Variance:</span>
                    <span className={cashCount.variance === 0 ? "text-green-600" : cashCount.variance > 0 ? "text-green-600" : "text-red-600"}>
                      {cashCount.variance >= 0 ? "+" : ""}{formatCurrency(cashCount.variance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Drawer Count Button */}
            {!cashCount && summary.cashTotal > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCashDrawer(true)}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Count Cash Drawer
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handlePrint()}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button
              onClick={onConfirmLogout}
              disabled={isLoading}
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoading ? "Logging out..." : "Confirm Logout"}
            </Button>
          </DialogFooter>

          {/* Hidden printable report */}
          <div className="hidden">
            <ShiftReport 
              ref={reportRef} 
              summary={summary} 
              cashDrawerCount={cashCount}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Drawer Dialog */}
      <CashDrawerDialog
        open={showCashDrawer}
        onOpenChange={setShowCashDrawer}
        expectedCash={summary.cashTotal}
        onSubmit={handleCashCountSubmit}
        isLoading={isSavingCount}
      />
    </>
  );
};

export default LogoutSummaryDialog;
