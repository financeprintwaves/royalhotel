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
import { Plus, Square, Circle, RectangleHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface AddTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTable: (data: {
    tableNumber: string;
    capacity: number;
    shape: 'square' | 'round' | 'rectangle';
  }) => Promise<void>;
}

export function AddTableDialog({
  open,
  onOpenChange,
  onCreateTable,
}: AddTableDialogProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [shape, setShape] = useState<'square' | 'round' | 'rectangle'>('square');
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
      });
      toast.success(`✨ Table ${tableNumber} created!`);
      setTableNumber('');
      setCapacity('4');
      setShape('square');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create table');
      console.error(error);
    } finally {
      setIsCreating(false);
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
          <div className="space-y-2">
            <Label htmlFor="tableNumber">Table Number / Name</Label>
            <Input
              id="tableNumber"
              placeholder="e.g., T1, Bar 1, Patio 3"
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
                <SelectItem value="2">👥 2 seats</SelectItem>
                <SelectItem value="4">👥 4 seats</SelectItem>
                <SelectItem value="6">👥 6 seats</SelectItem>
                <SelectItem value="8">👥 8 seats</SelectItem>
                <SelectItem value="10">👥 10+ seats</SelectItem>
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
