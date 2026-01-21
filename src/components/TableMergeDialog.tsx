import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Merge, Split, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantTable } from '@/types/pos';

interface TableMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  onMergeTables: (primaryTableId: string, tableIds: string[]) => Promise<void>;
  onSplitTables: (tableId: string) => Promise<void>;
}

export function TableMergeDialog({
  open,
  onOpenChange,
  tables,
  selectedTable,
  onMergeTables,
  onSplitTables,
}: TableMergeDialogProps) {
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if selected table is already merged
  const isMerged = selectedTable?.is_merged || (selectedTable?.merged_with && selectedTable.merged_with.length > 0);
  
  // Get available tables for merging (available status, not already merged, in same branch)
  const availableTables = useMemo(() => {
    if (!selectedTable) return [];
    return tables.filter(t => 
      t.id !== selectedTable.id && 
      t.status === 'available' && 
      !t.is_merged &&
      (!t.merged_with || t.merged_with.length === 0) &&
      t.branch_id === selectedTable.branch_id
    );
  }, [tables, selectedTable]);

  // Get merged tables info
  const mergedTables = useMemo(() => {
    if (!selectedTable?.merged_with?.length) return [];
    return tables.filter(t => selectedTable.merged_with?.includes(t.id));
  }, [tables, selectedTable]);

  // Calculate total capacity
  const totalCapacity = useMemo(() => {
    if (!selectedTable) return 0;
    const baseCapacity = selectedTable.capacity;
    const additionalCapacity = selectedTableIds.reduce((sum, id) => {
      const table = tables.find(t => t.id === id);
      return sum + (table?.capacity || 0);
    }, 0);
    return baseCapacity + additionalCapacity;
  }, [selectedTable, selectedTableIds, tables]);

  const handleToggleTable = (tableId: string) => {
    setSelectedTableIds(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleMerge = async () => {
    if (!selectedTable || selectedTableIds.length === 0) {
      toast.error('Please select at least one table to merge');
      return;
    }

    setIsProcessing(true);
    try {
      await onMergeTables(selectedTable.id, selectedTableIds);
      toast.success(`🔗 Merged ${selectedTableIds.length + 1} tables! Combined capacity: ${totalCapacity} seats`);
      setSelectedTableIds([]);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to merge tables');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!selectedTable) return;

    setIsProcessing(true);
    try {
      await onSplitTables(selectedTable.id);
      toast.success(`✂️ Tables have been split back to individual tables`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to split tables');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedTable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMerged ? (
              <>
                <Split className="h-5 w-5 text-orange-500" />
                Split Tables
              </>
            ) : (
              <>
                <Merge className="h-5 w-5 text-primary" />
                Merge Tables
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isMerged 
              ? `Table ${selectedTable.table_number} is currently merged with ${mergedTables.length} other table(s). Split them back to individual tables.`
              : `Combine adjacent tables for larger parties. Select tables to merge with ${selectedTable.table_number}.`
            }
          </DialogDescription>
        </DialogHeader>

        {isMerged ? (
          // Split view - show merged tables
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔗</span>
                <span className="font-semibold">Currently Merged Tables</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="text-sm py-1 px-3">
                  🍽️ {selectedTable.table_number} (Primary)
                </Badge>
                {mergedTables.map(t => (
                  <Badge key={t.id} variant="secondary" className="text-sm py-1 px-3">
                    🍽️ {t.table_number}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Combined capacity: {selectedTable.capacity + mergedTables.reduce((s, t) => s + t.capacity, 0)} seats</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-300">Before splitting</p>
                <p className="text-orange-600 dark:text-orange-400">Make sure all bills are settled before splitting merged tables.</p>
              </div>
            </div>
          </div>
        ) : (
          // Merge view - select tables
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="font-semibold">{selectedTable.table_number}</p>
                <p className="text-sm text-muted-foreground">
                  👥 {selectedTable.capacity} seats • {selectedTable.table_type || 'dining'}
                </p>
              </div>
            </div>

            {availableTables.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <span className="text-4xl mb-2 block">😅</span>
                <p>No available tables to merge with</p>
                <p className="text-sm">Only available (free) tables can be merged</p>
              </div>
            ) : (
              <>
                <Label className="text-sm font-medium">Select tables to merge:</Label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {availableTables.map(table => (
                    <div
                      key={table.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${selectedTableIds.includes(table.id) 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                      onClick={() => handleToggleTable(table.id)}
                    >
                      <Checkbox
                        checked={selectedTableIds.includes(table.id)}
                        onCheckedChange={() => handleToggleTable(table.id)}
                      />
                      <div>
                        <p className="font-medium">🍽️ {table.table_number}</p>
                        <p className="text-xs text-muted-foreground">
                          👥 {table.capacity} seats
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTableIds.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✨</span>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Combined capacity: {totalCapacity} seats
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {isMerged ? (
            <Button 
              onClick={handleSplit} 
              disabled={isProcessing}
              variant="destructive"
            >
              {isProcessing ? (
                'Splitting...'
              ) : (
                <>
                  <Split className="h-4 w-4 mr-2" />
                  Split Tables
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleMerge} 
              disabled={isProcessing || selectedTableIds.length === 0}
            >
              {isProcessing ? (
                'Merging...'
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge {selectedTableIds.length + 1} Tables
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}