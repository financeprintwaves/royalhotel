import { useRef } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, LogOut, Clock, Wallet, CreditCard, Smartphone } from "lucide-react";
import { SessionSummary } from "@/services/sessionService";
import ShiftReport from "./ShiftReport";
import { useReactToPrint } from "react-to-print";

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

  return (
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
          <ShiftReport ref={reportRef} summary={summary} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutSummaryDialog;
