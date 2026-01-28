import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, CheckCircle2, Coins, Banknote } from "lucide-react";
import {
  OMR_DENOMINATIONS,
  DenominationBreakdown,
  calculateTotalFromDenominations,
  VARIANCE_THRESHOLD,
} from "@/services/cashDrawerService";

interface CashDrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedCash: number;
  onSubmit: (countedCash: number, breakdown: DenominationBreakdown | null, notes: string) => void;
  isLoading?: boolean;
}

export default function CashDrawerDialog({
  open,
  onOpenChange,
  expectedCash,
  onSubmit,
  isLoading = false,
}: CashDrawerDialogProps) {
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [quickAmount, setQuickAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [denominations, setDenominations] = useState<DenominationBreakdown>({});

  const formatCurrency = (amount: number) => `OMR ${amount.toFixed(3)}`;

  // Calculate counted amount based on mode
  const countedCash = useMemo(() => {
    if (mode === "quick") {
      return parseFloat(quickAmount) || 0;
    }
    return calculateTotalFromDenominations(denominations);
  }, [mode, quickAmount, denominations]);

  const variance = countedCash - expectedCash;
  const requiresApproval = Math.abs(variance) > VARIANCE_THRESHOLD;

  const handleDenominationChange = (denomination: number, count: string) => {
    const countNum = parseInt(count) || 0;
    setDenominations((prev) => ({
      ...prev,
      [denomination.toString()]: countNum,
    }));
  };

  const handleSubmit = () => {
    onSubmit(
      countedCash,
      mode === "detailed" ? denominations : null,
      notes
    );
  };

  const handleReset = () => {
    setQuickAmount("");
    setNotes("");
    setDenominations({});
    setMode("quick");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cash Drawer Count
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Expected Cash */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Expected Cash</span>
              <span className="text-xl font-bold">{formatCurrency(expectedCash)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total cash payments processed during this shift
            </p>
          </div>

          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "quick" | "detailed")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Count</TabsTrigger>
              <TabsTrigger value="detailed">Denomination Count</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="quick-amount">Counted Cash Amount</Label>
                <Input
                  id="quick-amount"
                  type="number"
                  step="0.001"
                  placeholder="Enter total cash in drawer"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="text-lg"
                />
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4 mt-4">
              {/* Bills */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Banknote className="h-4 w-4" />
                  Bills
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {OMR_DENOMINATIONS.bills.map((denom) => (
                    <div key={denom.value} className="space-y-1">
                      <Label className="text-xs">{denom.label}</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[denom.value.toString()] || ""}
                        onChange={(e) => handleDenominationChange(denom.value, e.target.value)}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Coins */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="h-4 w-4" />
                  Coins
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {OMR_DENOMINATIONS.coins.map((denom) => (
                    <div key={denom.value} className="space-y-1">
                      <Label className="text-xs">{denom.label}</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[denom.value.toString()] || ""}
                        onChange={(e) => handleDenominationChange(denom.value, e.target.value)}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Counted Total */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Counted Cash</span>
              <span className="text-xl font-bold">{formatCurrency(countedCash)}</span>
            </div>
          </div>

          {/* Variance */}
          {countedCash > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              variance === 0 
                ? "bg-green-50 border-green-200" 
                : requiresApproval 
                  ? "bg-red-50 border-red-200" 
                  : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {variance === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className={`h-5 w-5 ${requiresApproval ? "text-red-600" : "text-amber-600"}`} />
                  )}
                  <span className="font-medium">Variance</span>
                </div>
                <span className={`text-xl font-bold ${
                  variance === 0 
                    ? "text-green-600" 
                    : variance > 0 
                      ? "text-green-600" 
                      : "text-red-600"
                }`}>
                  {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                </span>
              </div>
              {requiresApproval && (
                <div className="mt-2">
                  <Badge variant="destructive" className="text-xs">
                    Variance exceeds {formatCurrency(VARIANCE_THRESHOLD)} - Manager review required
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes {variance !== 0 && "(Explain variance)"}</Label>
            <Textarea
              id="notes"
              placeholder={variance !== 0 ? "Please explain the variance..." : "Optional notes..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || countedCash <= 0}
          >
            {isLoading ? "Saving..." : "Confirm Count"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
