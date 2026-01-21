import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Square, Circle, RectangleHorizontal, Wine, UtensilsCrossed, Sofa, TreePine } from 'lucide-react';
import { toast } from 'sonner';
import type { TableType } from '@/types/pos';
import { cn } from '@/lib/utils';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTable: (data: {
    tableNumber: string;
    capacity: number;
    shape: 'square' | 'round' | 'rectangle';
    tableType: TableType;
  }) => Promise<void>;
}

const TABLE_TYPES = [
  { value: 'dining', label: 'Dining', icon: UtensilsCrossed, emoji: '🍽️', description: 'Standard dining table' },
  { value: 'bar', label: 'Bar', icon: Wine, emoji: '🍸', description: 'Bar counter seating' },
  { value: 'booth', label: 'Booth', icon: Sofa, emoji: '🛋️', description: 'Cozy booth seating' },
  { value: 'outdoor', label: 'Outdoor', icon: TreePine, emoji: '🌳', description: 'Patio/outdoor table' },
] as const;

export function AddTableDialog({
  open,
  onOpenChange,
  onCreateTable,
}: AddTableDialogProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [shape, setShape] = useState<'square' | 'round' | 'rectangle'>('square');
  const [tableType, setTableType] = useState<TableType>('dining');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableNumber.trim()) {
      toast.error('Please enter a table number');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTable({
        tableNumber: tableNumber.trim(),
        capacity: parseInt(capacity, 10),
        shape,
        tableType,
      });
      toast.success(`✨ Table ${tableNumber} created!`);
      setTableNumber('');
      setCapacity('4');
      setShape('square');
      setTableType('dining');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create table');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  // Get recommended capacity based on table type
  const getRecommendedCapacities = () => {
    switch (tableType) {
      case 'bar':
        return ['1', '2', '3'];
      case 'booth':
        return ['2', '4', '6'];
      case 'outdoor':
        return ['4', '6', '8', '10'];
      default:
        return ['2', '4', '6', '8', '10'];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Table
          </DialogTitle>
          <DialogDescription>
            Create a new table for your floor plan. You can drag it to position after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Table Type Selection */}
          <div className="space-y-2">
            <Label>Table Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTableType(type.value)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                    tableType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-xl">{type.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tableNumber">Table Number / Name</Label>
            <Input
              id="tableNumber"
              placeholder={tableType === 'bar' ? 'e.g., Bar 1, Stool 3' : 'e.g., T1, Patio 3'}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Seating Capacity</Label>
            <Select value={capacity} onValueChange={setCapacity}>
              <SelectTrigger id="capacity">
                <SelectValue placeholder="Select capacity" />
              </SelectTrigger>
              <SelectContent>
                {getRecommendedCapacities().map(cap => (
                  <SelectItem key={cap} value={cap}>
                    👥 {cap} {cap === '1' ? 'seat' : 'seats'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Table Shape</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={shape === 'square' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setShape('square')}
              >
                <Square className="h-4 w-4" />
                Square
              </Button>
              <Button
                type="button"
                variant={shape === 'round' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setShape('round')}
              >
                <Circle className="h-4 w-4" />
                Round
              </Button>
              <Button
                type="button"
                variant={shape === 'rectangle' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setShape('rectangle')}
              >
                <RectangleHorizontal className="h-4 w-4" />
                Rectangle
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-center">
            <div className={cn(
              'flex items-center justify-center border-2 border-primary bg-primary/10',
              shape === 'round' && 'rounded-full w-16 h-16',
              shape === 'square' && 'rounded-xl w-16 h-16',
              shape === 'rectangle' && 'rounded-xl w-24 h-12',
              tableType === 'bar' && 'scale-90'
            )}>
              <span className="text-lg">
                {TABLE_TYPES.find(t => t.value === tableType)?.emoji}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Table
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
