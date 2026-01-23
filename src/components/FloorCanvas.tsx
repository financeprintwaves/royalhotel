import React, { useState, useEffect } from 'react';
import type { RestaurantTable, Order, TableType } from '@/types/pos';
import { DraggableTable } from './DraggableTable';
import { AddTableDialog } from './AddTableDialog';
import { TableMergeDialog } from './TableMergeDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Lock, Unlock, LayoutGrid, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createTable, updateTable, mergeTables, splitTables } from '@/services/tableService';
import { toast } from 'sonner';

interface FloorCanvasProps {
  tables: RestaurantTable[];
  orders: Order[];
  onTableSelect: (table: RestaurantTable) => void;
  selectedTableId?: string;
  isManagerOrAdmin?: boolean;
  onTablesChange?: () => void;
  selectedBranchId?: string; // Branch context for creating tables
}

export function FloorCanvas({
  tables,
  orders,
  onTableSelect,
  selectedTableId,
  isManagerOrAdmin = false,
  onTablesChange,
  selectedBranchId,
}: FloorCanvasProps) {
  const [editMode, setEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [selectedTableForMerge, setSelectedTableForMerge] = useState<RestaurantTable | null>(null);
  const [tableBills, setTableBills] = useState<Record<string, number>>({});

  // Calculate bill amounts for occupied tables
  useEffect(() => {
    const bills: Record<string, number> = {};
    orders.forEach(order => {
      if (order.table_id && ['CREATED', 'SENT_TO_KITCHEN', 'SERVED', 'BILL_REQUESTED'].includes(order.order_status)) {
        bills[order.table_id] = (bills[order.table_id] || 0) + Number(order.total_amount || 0);
      }
    });
    setTableBills(bills);
  }, [orders]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData('tableId');
    if (!tableId || !editMode) return;

    const canvas = document.getElementById('floor-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.round((e.clientX - rect.left - 60) / 10) * 10);
    const y = Math.max(0, Math.round((e.clientY - rect.top - 60) / 10) * 10);

    try {
      await updateTable(tableId, { position_x: x, position_y: y });
      onTablesChange?.();
    } catch (error) {
      console.error('Failed to update table position:', error);
      toast.error('Failed to save table position');
    }
  };

  const handleCreateTable = async (data: {
    tableNumber: string;
    capacity: number;
    shape: 'square' | 'round' | 'rectangle';
    tableType: TableType;
  }) => {
    // Find next available position
    const maxX = Math.max(0, ...tables.map(t => (t.position_x || 0)));
    const newX = tables.length > 0 ? maxX + 140 : 20;
    const newY = 20;

    // Create table with position and type - pass the selected branch for admins
    const newTable = await createTable(data.tableNumber, data.capacity, data.tableType, selectedBranchId);
    
    // Update with shape and position
    await updateTable(newTable.id, {
      shape: data.shape,
      position_x: newX,
      position_y: newY,
    });
    
    onTablesChange?.();
  };

  const handleTableDragEnd = async (tableId: string, x: number, y: number) => {
    try {
      const snappedX = Math.round(x / 10) * 10;
      const snappedY = Math.round(y / 10) * 10;
      await updateTable(tableId, { position_x: snappedX, position_y: snappedY });
      onTablesChange?.();
    } catch (error) {
      console.error('Failed to update table position:', error);
      toast.error('Failed to save table position');
    }
  };

  const handleTableResizeEnd = async (tableId: string, width: number, height: number) => {
    try {
      const snappedWidth = Math.round(width / 10) * 10;
      const snappedHeight = Math.round(height / 10) * 10;
      await updateTable(tableId, { width: snappedWidth, height: snappedHeight });
      onTablesChange?.();
    } catch (error) {
      console.error('Failed to update table size:', error);
      toast.error('Failed to save table size');
    }
  };

  // Filter out tables that are merged into another table (hide them)
  const visibleTables = tables.filter(t => {
    // Show if not merged, or if it's a primary merged table
    if (!t.is_merged) return true;
    if (t.merged_with && t.merged_with.length > 0) return true;
    return false;
  });

  // Auto-arrange tables in a neat grid
  const handleAutoArrange = async () => {
    if (visibleTables.length === 0) return;
    
    const PADDING = 20;
    const GAP = 30;
    const TABLE_SIZE = 130; // Base size for grid cells
    
    // Calculate columns based on canvas width (estimate 800px if not available)
    const canvas = document.getElementById('floor-canvas');
    const canvasWidth = canvas?.clientWidth || 800;
    const columns = Math.max(1, Math.floor((canvasWidth - PADDING * 2) / (TABLE_SIZE + GAP)));
    
    try {
      const updates = visibleTables.map((table, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = PADDING + col * (TABLE_SIZE + GAP);
        const y = PADDING + row * (TABLE_SIZE + GAP);
        return updateTable(table.id, { position_x: x, position_y: y });
      });
      
      await Promise.all(updates);
      onTablesChange?.();
      toast.success(`Arranged ${visibleTables.length} tables in a grid`);
    } catch (error) {
      console.error('Failed to auto-arrange tables:', error);
      toast.error('Failed to arrange tables');
    }
  };

  const handleMergeClick = (table: RestaurantTable) => {
    setSelectedTableForMerge(table);
    setShowMergeDialog(true);
  };

  const handleMergeTables = async (primaryTableId: string, tableIds: string[]) => {
    await mergeTables(primaryTableId, tableIds);
    onTablesChange?.();
  };

  const handleSplitTables = async (tableId: string) => {
    await splitTables(tableId);
    onTablesChange?.();
  };

  // Stats
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            🍽️ Floor Plan
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              🟢 {stats.available} Free
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              🟠 {stats.occupied} Occupied
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              🔵 {stats.reserved} Reserved
            </Badge>
          </div>
        </div>

        {isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            {editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoArrange}
                className="gap-2"
                title="Arrange all tables in a neat grid"
              >
                <Grid3X3 className="h-4 w-4" />
                Auto-Arrange
              </Button>
            )}
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              {editMode ? (
                <>
                  <Lock className="h-4 w-4" />
                  Lock Layout
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  Edit Layout
                </>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Table
            </Button>
          </div>
        )}
      </div>

      {/* Edit mode indicator */}
      {editMode && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm text-primary font-medium">
            ✨ Edit Mode: Drag tables to rearrange • Click 🔗 to merge/split tables • Click "Lock Layout" when done
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        id="floor-canvas"
        className={cn(
          'flex-1 relative overflow-auto p-4',
          'bg-gradient-to-br from-muted/30 to-muted/50',
          editMode && 'bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'%23e5e7eb\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")]',
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ minHeight: '500px' }}
      >
        {visibleTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <LayoutGrid className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No tables yet</p>
            <p className="text-sm">Click "Add Table" to create your first table</p>
          </div>
        ) : (
          visibleTables.map(table => (
            <DraggableTable
              key={table.id}
              table={table}
              billAmount={tableBills[table.id]}
              onSelect={() => onTableSelect(table)}
              onDragEnd={(x, y) => handleTableDragEnd(table.id, x, y)}
              onResizeEnd={(w, h) => handleTableResizeEnd(table.id, w, h)}
              editable={editMode}
              isSelected={table.id === selectedTableId}
              onMergeClick={editMode ? () => handleMergeClick(table) : undefined}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t bg-card flex items-center justify-center gap-6 text-sm flex-wrap">
        <span className="flex items-center gap-1">🟢 Available</span>
        <span className="flex items-center gap-1">🟠 Occupied</span>
        <span className="flex items-center gap-1">🔵 Reserved</span>
        <span className="flex items-center gap-1">🟡 Cleaning</span>
        <span className="flex items-center gap-1">💰 Bill Amount</span>
        <span className="flex items-center gap-1">🔗 Merged</span>
      </div>

      <AddTableDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreateTable={handleCreateTable}
      />

      <TableMergeDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        tables={tables}
        selectedTable={selectedTableForMerge}
        onMergeTables={handleMergeTables}
        onSplitTables={handleSplitTables}
      />
    </div>
  );
}
