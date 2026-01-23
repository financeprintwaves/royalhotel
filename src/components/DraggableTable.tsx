import React, { useEffect, useRef, useState } from 'react';
import type { RestaurantTable } from '@/types/pos';
import { cn } from '@/lib/utils';
import { Users, GripVertical, Merge, Wine, UtensilsCrossed, Sofa, TreePine } from 'lucide-react';

interface DraggableTableProps {
  table: RestaurantTable;
  billAmount?: number;
  onSelect: () => void;
  onDragEnd?: (x: number, y: number) => void;
  editable?: boolean;
  isSelected?: boolean;
  onMergeClick?: () => void;
}

const STATUS_CONFIG = {
  available: {
    emoji: '🟢',
    label: 'FREE',
    className: 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30',
    textClass: 'text-green-700 dark:text-green-300',
  },
  occupied: {
    emoji: '🟠',
    label: 'OCCUPIED',
    className: 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 animate-table-pulse',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  reserved: {
    emoji: '🔵',
    label: 'RESERVED',
    className: 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  cleaning: {
    emoji: '🟡',
    label: 'CLEANING',
    className: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30',
    textClass: 'text-yellow-700 dark:text-yellow-300',
  },
};

// Table type configurations with distinct styling
const TABLE_TYPE_CONFIG = {
  dining: {
    icon: UtensilsCrossed,
    emoji: '🍽️',
    bgAccent: '',
    label: 'Dining',
  },
  bar: {
    icon: Wine,
    emoji: '🍸',
    bgAccent: 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20',
    label: 'Bar',
  },
  booth: {
    icon: Sofa,
    emoji: '🛋️',
    bgAccent: 'bg-gradient-to-br from-amber-50/50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20',
    label: 'Booth',
  },
  outdoor: {
    icon: TreePine,
    emoji: '🌳',
    bgAccent: 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20',
    label: 'Outdoor',
  },
};

// Shape-specific dimensions and styles
const getShapeStyles = (shape: string | undefined, tableType: string | undefined) => {
  const isBar = tableType === 'bar';
  
  switch (shape) {
    case 'round':
      return {
        className: 'rounded-full',
        width: isBar ? 100 : 120,
        height: isBar ? 100 : 120,
        minWidth: isBar ? 80 : 100,
        minHeight: isBar ? 80 : 100,
      };
    case 'rectangle':
      return {
        className: 'rounded-xl',
        width: isBar ? 160 : 180,
        height: isBar ? 70 : 90,
        minWidth: isBar ? 140 : 160,
        minHeight: isBar ? 60 : 80,
      };
    default: // square
      return {
        className: 'rounded-xl',
        width: isBar ? 90 : 120,
        height: isBar ? 90 : 120,
        minWidth: isBar ? 80 : 100,
        minHeight: isBar ? 80 : 100,
      };
  }
};

export function DraggableTable({
  table,
  billAmount,
  onSelect,
  onDragEnd,
  editable = false,
  isSelected = false,
  onMergeClick,
}: DraggableTableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [didDrag, setDidDrag] = useState(false);

  // Local position so the table moves immediately in the UI while dragging.
  const [pos, setPos] = useState(() => ({
    x: table.position_x || 0,
    y: table.position_y || 0,
  }));

  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const tableType = table.table_type || 'dining';
  const typeConfig = TABLE_TYPE_CONFIG[tableType] || TABLE_TYPE_CONFIG.dining;
  const shapeStyles = getShapeStyles(table.shape, table.table_type);
  const isMerged = table.is_merged || (table.merged_with && table.merged_with.length > 0);

  // Keep local position in sync with backend updates (when not actively dragging).
  useEffect(() => {
    if (isDragging) return;
    setPos({
      x: table.position_x || 0,
      y: table.position_y || 0,
    });
  }, [table.position_x, table.position_y, isDragging]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag="true"]')) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDidDrag(false);

    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft: pos.x,
      startTop: pos.y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !isDragging) return;
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;

    if (!didDrag && Math.abs(dx) + Math.abs(dy) > 3) {
      setDidDrag(true);
    }

    setPos({
      x: Math.max(0, dragRef.current.startLeft + dx),
      y: Math.max(0, dragRef.current.startTop + dy),
    });
  };

  const finishPointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !isDragging) return;
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    const finalX = Math.max(0, dragRef.current.startLeft + dx);
    const finalY = Math.max(0, dragRef.current.startTop + dy);

    setIsDragging(false);
    dragRef.current = null;

    setPos({ x: finalX, y: finalY });
    // Persist position (snapping handled by parent)
    onDragEnd?.(finalX, finalY);
  };

  const handleMergeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMergeClick?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    // In edit mode, a drag should not trigger a click/select.
    if (editable && didDrag) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelect();
  };

  // Calculate display dimensions
  const displayWidth = table.width || shapeStyles.width;
  const displayHeight = table.height || shapeStyles.height;

  return (
    <div
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onClick={handleClick}
      className={cn(
        'absolute flex flex-col items-center justify-center p-2 border-2 shadow-lg transition-all duration-200',
        shapeStyles.className,
        config.className,
        typeConfig.bgAccent,
        isDragging && 'opacity-50 scale-110 rotate-2',
        isSelected && 'ring-4 ring-primary ring-offset-2',
        editable ? 'cursor-grab active:cursor-grabbing touch-none select-none' : 'cursor-pointer',
        'hover:scale-105 hover:shadow-xl',
        isMerged && 'ring-2 ring-purple-500 ring-offset-1'
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: displayWidth,
        height: displayHeight,
        minWidth: shapeStyles.minWidth,
        minHeight: shapeStyles.minHeight,
      }}
    >
      {/* Merge indicator */}
      {isMerged && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1 shadow-lg z-10">
          <Merge className="h-3 w-3" />
        </div>
      )}

      {/* Drag handle for edit mode */}
      {editable && (
        <div className="absolute top-1 right-1 p-0.5 rounded bg-white/50 dark:bg-black/30" data-no-drag="true">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Merge button for managers in edit mode */}
      {editable && onMergeClick && (
        <button
          onClick={handleMergeClick}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          data-no-drag="true"
          className="absolute top-1 left-1 p-1 rounded bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
          title={isMerged ? 'Split tables' : 'Merge tables'}
        >
          <Merge className="h-3 w-3 text-purple-600 dark:text-purple-400" />
        </button>
      )}

      {/* Table number with type emoji */}
      <div className="flex items-center gap-1 font-bold text-sm">
        <span className="text-base">{typeConfig.emoji}</span>
        <span className={config.textClass}>{table.table_number}</span>
      </div>

      {/* Bill amount for occupied tables */}
      {billAmount !== undefined && billAmount > 0 && (
        <div className="flex items-center gap-0.5 text-xs font-semibold animate-bill-bounce">
          <span>💰</span>
          <span className="text-orange-600 dark:text-orange-400">
            {billAmount.toFixed(3)}
          </span>
        </div>
      )}

      {/* Capacity - hide on small tables */}
      {displayHeight >= 90 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          <span>{table.capacity}</span>
        </div>
      )}

      {/* Status badge - compact for round/small tables */}
      <div className={cn(
        'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        config.className.includes('green') && 'bg-green-200/50 dark:bg-green-800/50',
        config.className.includes('orange') && 'bg-orange-200/50 dark:bg-orange-800/50',
        config.className.includes('blue') && 'bg-blue-200/50 dark:bg-blue-800/50',
        config.className.includes('yellow') && 'bg-yellow-200/50 dark:bg-yellow-800/50',
      )}>
        <span>{config.emoji}</span>
        {table.shape !== 'round' && displayWidth >= 100 && (
          <span className={config.textClass}>{config.label}</span>
        )}
      </div>
    </div>
  );
}
