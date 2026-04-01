import React, { useEffect, useState } from 'react';
import ComboMealService, { ComboMeal, ComboMealItem } from '@/services/comboMealService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ComboMealBuilderProps {
  branchId: string;
  onAddToOrder: (comboId: string, selectedSet: Record<string, number>, quantity: number) => void;
}

export default function ComboMealBuilder({ branchId, onAddToOrder }: ComboMealBuilderProps) {
  const [comboMeals, setComboMeals] = useState<ComboMeal[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<ComboMeal | null>(null);
  const [comboItems, setComboItems] = useState<ComboMealItem[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const combos = await ComboMealService.getActiveCombos(branchId);
        setComboMeals(combos);
        if (combos.length > 0) setSelectedCombo(combos[0]);
      } catch (e) {
        setError('Failed to load combo meals.');
      }
    }
    load();
  }, [branchId]);

  useEffect(() => {
    if (!selectedCombo) return;
    async function loadItems() {
      const items = await ComboMealService.getComboItems(selectedCombo.id);
      setComboItems(items);
      const defaults = items.reduce<Record<string, number>>((acc, it) => {
        acc[it.id] = it.quantity;
        return acc;
      }, {});
      setSelectedOptions(defaults);
    }
    loadItems();
  }, [selectedCombo]);

  const handleQuantity = (operation: 'inc' | 'dec') => {
    setQuantity((prev) => Math.max(1, operation === 'inc' ? prev + 1 : prev - 1));
  };

  const handleItemQty = (itemId: string, value: number) => {
    setSelectedOptions((prev) => ({ ...prev, [itemId]: Math.max(1, value) }));
  };

  const handleAdd = () => {
    if (!selectedCombo) return;
    onAddToOrder(selectedCombo.id, selectedOptions, quantity);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Combo Meal Builder</h2>
      {error && <div className="text-destructive">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          className="border border-border rounded-lg p-2"
          value={selectedCombo?.id}
          onChange={(e) => {
            const combo = comboMeals.find((cm) => cm.id === e.target.value);
            setSelectedCombo(combo ?? null);
          }}
        >
          {comboMeals.map((combo) => (
            <option key={combo.id} value={combo.id}>
              {combo.name} - ${combo.price.toFixed(2)}
            </option>
          ))}
        </select>

        {selectedCombo && (
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-lg font-semibold">{selectedCombo.name}</div>
            <p className="text-sm text-muted-foreground">{selectedCombo.description}</p>
            <div className="mt-2 text-sm">Price: ${selectedCombo.price.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-3 bg-card">
        <h3 className="font-semibold mb-2">Combo Items</h3>
        <div className="space-y-2">
          {comboItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span>{item.menu_item_id} (qty {item.quantity})</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleItemQty(item.id, (selectedOptions[item.id] || 1) - 1)}>
                  -
                </Button>
                <Input
                  type="number"
                  value={selectedOptions[item.id] || item.quantity}
                  onChange={(e) => handleItemQty(item.id, Number(e.target.value))}
                  className="w-16 text-center"
                />
                <Button variant="secondary" size="sm" onClick={() => handleItemQty(item.id, (selectedOptions[item.id] || 1) + 1)}>
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleQuantity('dec')}>-</Button>
          <span>{quantity}</span>
          <Button variant="secondary" size="sm" onClick={() => handleQuantity('inc')}>+</Button>
        </div>
        <Button onClick={handleAdd}>Add Combo</Button>
      </div>
    </div>
  );
}
