import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderTotal: number;
  onApplyDiscount: (amount: number) => void;
}

export default function DiscountDialog({
  open,
  onOpenChange,
  orderTotal,
  onApplyDiscount,
}: DiscountDialogProps) {
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);

  const handleValueChange = (value: string) => {
    setDiscountValue(value);

    if (value && !isNaN(Number(value))) {
      if (discountType === 'percent') {
        const discount = (orderTotal * Number(value)) / 100;
        setCalculatedDiscount(Math.min(discount, orderTotal)); // Cap at order total
      } else {
        setCalculatedDiscount(Math.min(Number(value), orderTotal)); // Fixed amount
      }
    }
  };

  const handleApply = () => {
    if (calculatedDiscount > 0) {
      onApplyDiscount(calculatedDiscount);
      onOpenChange(false);
      setDiscountValue('');
      setCalculatedDiscount(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <Tabs
          value={discountType}
          onValueChange={(val) => {
            setDiscountType(val as 'fixed' | 'percent');
            setDiscountValue('');
            setCalculatedDiscount(0);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="percent">Percentage</TabsTrigger>
            <TabsTrigger value="fixed">Fixed Amount</TabsTrigger>
          </TabsList>

          <TabsContent value="percent" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="percent-input">Discount Percentage (%)</Label>
              <Input
                id="percent-input"
                type="number"
                placeholder="Enter percentage"
                value={discountValue}
                onChange={(e) => handleValueChange(e.target.value)}
                min="0"
                max="100"
              />
              <div className="text-sm text-muted-foreground">
                Discount Amount: ${calculatedDiscount.toFixed(2)}
              </div>
            </div>

            <div className="bg-muted p-3 rounded space-y-1">
              <div className="text-sm">Order Total: ${orderTotal.toFixed(2)}</div>
              <div className="text-sm font-semibold">
                New Total: ${(orderTotal - calculatedDiscount).toFixed(2)}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fixed" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fixed-input">Discount Amount ($)</Label>
              <Input
                id="fixed-input"
                type="number"
                placeholder="Enter amount"
                value={discountValue}
                onChange={(e) => handleValueChange(e.target.value)}
                min="0"
                max={orderTotal}
              />
              <div className="text-sm text-muted-foreground">
                Max: ${orderTotal.toFixed(2)}
              </div>
            </div>

            <div className="bg-muted p-3 rounded space-y-1">
              <div className="text-sm">Order Total: ${orderTotal.toFixed(2)}</div>
              <div className="text-sm font-semibold">
                New Total: ${(orderTotal - calculatedDiscount).toFixed(2)}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={calculatedDiscount <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Apply ${calculatedDiscount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
