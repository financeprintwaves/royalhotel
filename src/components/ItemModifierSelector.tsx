import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus } from 'lucide-react';

export interface ItemModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple'; // single = radio, multiple = checkbox
  required: boolean;
  options: {
    id: string;
    name: string;
    priceAdjustment: number;
  }[];
}

export interface ComboMeal {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  items: {
    menuItemId: string;
    quantity: number;
    name: string;
    price: number;
  }[];
}

interface ItemModifierSelectorProps {
  modifiers: ItemModifier[];
  onConfirm: (selectedModifiers: Record<string, string | string[]>) => void;
  onCancel: () => void;
  itemName: string;
}

export function ItemModifierSelector({ modifiers, onConfirm, onCancel, itemName }: ItemModifierSelectorProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});

  const handleSingleSelect = (modifierId: string, optionId: string) => {
    setSelectedModifiers(prev => ({
      ...prev,
      [modifierId]: optionId
    }));
  };

  const handleMultipleSelect = (modifierId: string, optionId: string, checked: boolean) => {
    setSelectedModifiers(prev => {
      const current = (prev[modifierId] as string[]) || [];
      if (checked) {
        return { ...prev, [modifierId]: [...current, optionId] };
      } else {
        return { ...prev, [modifierId]: current.filter(id => id !== optionId) };
      }
    });
  };

  const canConfirm = modifiers.filter(m => m.required).every(m => selectedModifiers[m.id]);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize: {itemName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {modifiers.map(modifier => (
              <div key={modifier.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <Label className="text-base font-semibold">
                    {modifier.name}
                    {modifier.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                </div>

                <div className="space-y-2 pl-2">
                  {modifier.type === 'single' ? (
                    <RadioGroup value={selectedModifiers[modifier.id] as string || ''}>
                      {modifier.options.map(option => (
                        <div key={option.id} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={option.id}
                            id={`${modifier.id}-${option.id}`}
                            onClick={() => handleSingleSelect(modifier.id, option.id)}
                          />
                          <Label htmlFor={`${modifier.id}-${option.id}`} className="flex-1 cursor-pointer">
                            {option.name}
                            {option.priceAdjustment > 0 && (
                              <span className="text-sm text-muted-foreground ml-1">
                                +{option.priceAdjustment.toFixed(2)} OMR
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {modifier.options.map(option => (
                        <div key={option.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`${modifier.id}-${option.id}`}
                            checked={(selectedModifiers[modifier.id] as string[])?.includes(option.id) || false}
                            onCheckedChange={(checked) =>
                              handleMultipleSelect(modifier.id, option.id, !!checked)
                            }
                          />
                          <Label htmlFor={`${modifier.id}-${option.id}`} className="flex-1 cursor-pointer">
                            {option.name}
                            {option.priceAdjustment > 0 && (
                              <span className="text-sm text-muted-foreground ml-1">
                                +{option.priceAdjustment.toFixed(2)} OMR
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selectedModifiers)} disabled={!canConfirm}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ComboMealSelectorProps {
  combos: ComboMeal[];
  onSelect: (combo: ComboMeal) => void;
  onCancel: () => void;
}

export function ComboMealSelector({ combos, onSelect, onCancel }: ComboMealSelectorProps) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Combo Meal</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {combos.map(combo => (
            <button
              key={combo.id}
              onClick={() => onSelect(combo)}
              className="p-4 border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="font-bold text-lg">{combo.name}</div>
              {combo.description && <div className="text-sm text-muted-foreground">{combo.description}</div>}
              <div className="mt-2 space-y-1 text-xs">
                {combo.items.map(item => (
                  <div key={item.menuItemId} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span className="text-muted-foreground">{item.price.toFixed(2)} OMR</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 font-bold text-base text-primary">
                {combo.basePrice.toFixed(2)} OMR
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
