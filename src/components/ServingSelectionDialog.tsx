import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wine, GlassWater } from 'lucide-react';
import type { MenuItem } from '@/types/pos';

interface ServingSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onSelect: (item: MenuItem, isServing: boolean) => void;
}

export default function ServingSelectionDialog({
  open,
  onOpenChange,
  item,
  onSelect,
}: ServingSelectionDialogProps) {
  if (!item) return null;

  const handleSelect = (isServing: boolean) => {
    onSelect(item, isServing);
    onOpenChange(false);
  };

  const servingsPerBottle = item.bottle_size_ml && item.serving_size_ml 
    ? Math.floor(item.bottle_size_ml / item.serving_size_ml)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center text-sm text-muted-foreground mb-6">
            How would you like to sell this?
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Bottle Option */}
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5"
              onClick={() => handleSelect(false)}
            >
              <Wine className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-lg">Bottle</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {item.price.toFixed(3)} OMR
                </p>
                {item.bottle_size_ml && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.bottle_size_ml}ml
                  </p>
                )}
              </div>
            </Button>

            {/* Serving/Shot Option */}
            <Button
              variant="outline"
              className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5"
              onClick={() => handleSelect(true)}
            >
              <GlassWater className="h-10 w-10 text-accent-foreground" />
              <div className="text-center">
                <p className="font-semibold text-lg">Shot/Glass</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {(item.serving_price || 0).toFixed(3)} OMR
                </p>
                {item.serving_size_ml && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.serving_size_ml}ml
                    {servingsPerBottle && ` (~${servingsPerBottle}/bottle)`}
                  </p>
                )}
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
