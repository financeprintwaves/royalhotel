import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wine, GlassWater, Package } from 'lucide-react';
import { formatOMR } from '@/lib/currency';
import type { MenuItem, PortionOption } from '@/types/pos';

interface PortionSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onSelect: (item: MenuItem, selectedPortion?: PortionOption, isServing?: boolean) => void;
}

export default function PortionSelectionDialog({
  open,
  onOpenChange,
  item,
  onSelect,
}: PortionSelectionDialogProps) {
  if (!item) return null;

  // Ensure portion_options is always an array (could be object/null from DB)
  const portionOptions = Array.isArray(item.portion_options) ? item.portion_options : [];
  
  // Check if item has custom portion options
  const hasPortionOptions = portionOptions.length > 0;
  
  // Check if item has legacy bottle/shot pricing
  const hasLegacyServing = item.billing_type === 'by_serving' && item.serving_price;

  const handlePortionSelect = (portion: PortionOption) => {
    onSelect(item, portion, false);
    onOpenChange(false);
  };

  const handleLegacySelect = (isServing: boolean) => {
    onSelect(item, undefined, isServing);
    onOpenChange(false);
  };

  const servingsPerBottle = item.bottle_size_ml && item.serving_size_ml 
    ? Math.floor(item.bottle_size_ml / item.serving_size_ml)
    : null;

  // Render portion options (Small/Medium/Large style)
  if (hasPortionOptions) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{item.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Select portion size:
            </p>
            <div className={`grid gap-3 ${portionOptions.length <= 3 ? `grid-cols-${portionOptions.length}` : 'grid-cols-3'}`}>
              {portionOptions.map((portion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto flex-col gap-2 p-4 hover:border-primary hover:bg-primary/5"
                  onClick={() => handlePortionSelect(portion)}
                >
                  <Package className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold">{portion.name}</p>
                    <p className="text-xl font-bold text-primary mt-1">
                      {formatOMR(portion.price)}
                    </p>
                    {(portion.size || portion.size_ml) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {portion.size || `${portion.size_ml}ml`}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
            {/* Also show full price option */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="secondary"
                className="w-full h-auto py-3"
                onClick={() => {
                  onSelect(item, undefined, false);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span>Full ({item.name})</span>
                  <span className="font-bold text-primary">{formatOMR(item.price)}</span>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render legacy bottle/shot dialog
  if (hasLegacyServing) {
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
                onClick={() => handleLegacySelect(false)}
              >
                <Wine className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-semibold text-lg">Bottle</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatOMR(item.price)}
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
                onClick={() => handleLegacySelect(true)}
              >
                <GlassWater className="h-10 w-10 text-accent-foreground" />
                <div className="text-center">
                  <p className="font-semibold text-lg">Shot/Glass</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatOMR(item.serving_price || 0)}
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

  // Fallback - shouldn't normally reach here
  return null;
}
