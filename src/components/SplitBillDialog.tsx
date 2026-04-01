import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Users, DivideIcon } from 'lucide-react';
import type { CartItem } from '@/types/pos';

export interface SplitBillData {
  id: string;
  name: string;
  items: CartItem[];
  subtotal: number;
  taxShare: number;
  totalShare: number;
  paymentMethod?: string;
}

interface SplitBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  onConfirm: (splits: SplitBillData[]) => void;
}

export function SplitBillDialog({
  open,
  onOpenChange,
  cartItems,
  subtotal,
  tax,
  discount,
  onConfirm,
}: SplitBillDialogProps) {
  const [splitCount, setSplitCount] = useState(2);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  const [splits, setSplits] = useState<SplitBillData[]>([]);
  const [selectedSplitIdx, setSelectedSplitIdx] = useState(0);

  // Initialize splits
  const initializeSplits = () => {
    const amountPerSplit = (subtotal - discount) / splitCount;
    const taxPerSplit = tax / splitCount;

    const newSplits: SplitBillData[] = Array.from({ length: splitCount }, (_, i) => ({
      id: `split-${i}`,
      name: `Person ${i + 1}`,
      items: [],
      subtotal: amountPerSplit,
      taxShare: taxPerSplit,
      totalShare: amountPerSplit + taxPerSplit,
    }));

    // Distribute items equally
    cartItems.forEach((item, idx) => {
      const targetSplit = idx % splitCount;
      newSplits[targetSplit].items.push(item);
    });

    setSplits(newSplits);
  };

  const handleSplitCountChange = (count: number) => {
    setSplitCount(Math.max(2, Math.min(10, count)));
  };

  const updateSplitAmount = (idx: number, amount: number) => {
    setSplits(prev =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, subtotal: Math.max(0, amount), totalShare: Math.max(0, amount) + s.taxShare }
          : s
      )
    );
  };

  const updateSplitName = (idx: number, name: string) => {
    setSplits(prev =>
      prev.map((s, i) => (i === idx ? { ...s, name } : s))
    );
  };

  const moveItem = (itemIdx: number, fromSplit: number, toSplit: number) => {
    if (fromSplit === toSplit) return;

    setSplits(prev => {
      const newSplits = [...prev];
      const item = newSplits[fromSplit].items[itemIdx];

      newSplits[fromSplit].items.splice(itemIdx, 1);
      newSplits[toSplit].items.push(item);

      // Recalculate amounts
      const fromTotal = newSplits[fromSplit].items.reduce((sum, i) => sum + i.quantity * i.menuItem.price, 0);
      const toTotal = newSplits[toSplit].items.reduce((sum, i) => sum + i.quantity * i.menuItem.price, 0);

      newSplits[fromSplit].subtotal = fromTotal;
      newSplits[toSplit].subtotal = toTotal;

      return newSplits;
    });
  };

  const handleConfirm = () => {
    onConfirm(splits);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DivideIcon className="h-5 w-5" />
            Split Bill
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="distribute">Distribute Items</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-2">
              <Label>Split Method</Label>
              <div className="flex gap-2">
                <Button
                  variant={splitMethod === 'equal' ? 'default' : 'outline'}
                  onClick={() => setSplitMethod('equal')}
                >
                  Equal Split
                </Button>
                <Button
                  variant={splitMethod === 'manual' ? 'default' : 'outline'}
                  onClick={() => setSplitMethod('manual')}
                >
                  Manual Split
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Number of People ({splitCount})
              </Label>
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSplitCountChange(splitCount - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{splitCount}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSplitCountChange(splitCount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bill Summary</Label>
              <Card>
                <CardContent className="pt-6 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{subtotal.toFixed(3)} OMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{tax.toFixed(3)} OMR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{discount.toFixed(3)} OMR</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1">
                    <span>Total:</span>
                    <span>{(subtotal + tax - discount).toFixed(3)} OMR</span>
                  </div>
                  {splitMethod === 'equal' && (
                    <div className="flex justify-between text-primary pt-2 border-t">
                      <span>Per Person:</span>
                      <span className="font-bold">
                        {((subtotal + tax - discount) / splitCount).toFixed(3)} OMR
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button className="w-full" onClick={initializeSplits}>
              Create {splitCount} Splits
            </Button>
          </TabsContent>

          {/* Distribute Items Tab */}
          <TabsContent value="distribute" className="space-y-4">
            {splits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Initialize splits first using the Setup tab
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {splits.map((split, splitIdx) => (
                  <Card key={split.id} className="border-2 border-slate-200">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Input
                            value={split.name}
                            onChange={(e) => updateSplitName(splitIdx, e.target.value)}
                            className="text-sm"
                          />
                          <span className="text-lg font-bold text-primary ml-2 whitespace-nowrap">
                            {split.totalShare.toFixed(3)} OMR
                          </span>
                        </div>

                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {split.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm"
                            >
                              <span className="flex-1">
                                {item.menuItem.name} ×{item.quantity}
                              </span>
                              <div className="flex gap-1">
                                {splitIdx > 0 && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => moveItem(itemIdx, splitIdx, splitIdx - 1)}
                                  >
                                    ←
                                  </Button>
                                )}
                                {splitIdx < splits.length - 1 && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => moveItem(itemIdx, splitIdx, splitIdx + 1)}
                                  >
                                    →
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {splitMethod === 'manual' && (
                          <Input
                            type="number"
                            step="0.001"
                            value={split.subtotal}
                            onChange={(e) => updateSplitAmount(splitIdx, parseFloat(e.target.value))}
                            placeholder="Custom amount"
                            className="text-sm"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            {splits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No splits created yet
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {splits.map((split, idx) => (
                    <Card key={split.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold">{split.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {split.items.length} items
                            </div>
                            <div className="mt-2 space-y-1">
                              {split.items.map((item, i) => (
                                <div key={i} className="text-xs">
                                  • {item.menuItem.name} ×{item.quantity}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {split.totalShare.toFixed(3)} OMR
                            </div>
                            <Badge variant="outline" className="mt-2">
                              {splitMethod === 'equal' ? 'Equal' : 'Custom'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between font-bold">
                      <span>Total Check Amount:</span>
                      <span>{splits.reduce((sum, s) => sum + s.totalShare, 0).toFixed(3)} OMR</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={splits.length === 0}>
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
