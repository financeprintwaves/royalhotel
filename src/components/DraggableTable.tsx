import React, { useEffect, useRef, useState } from 'react';
import type { RestaurantTable } from '@/types/pos';
import { cn } from '@/lib/utils';
import { Users, GripVertical, Merge, Wine, UtensilsCrossed, Sofa, TreePine } from 'lucide-react';

interface DraggableTableProps {
  table: RestaurantTable;
  billAmount?: number;
  onSelect: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
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

const getShapeStyles = (shape: string | undefined, tableType: string | undefined) => {
  const isBar = tableType === 'bar';
  
  switch (shape) {
    case 'round':
      return {
        className: 'rounded-full',
        width: isBar ? 100 : 120,
        height: isBar ? 100 : 120,
        minWidth: 60,
        minHeight: 60,
      };
    case 'rectangle':
      return {
        className: 'rounded-xl',
        width: isBar ? 160 : 180,
        height: isBar ? 70 : 90,
        minWidth: 80,
        minHeight: 50,
      };
    default:
      return {
        className: 'rounded-xl',
        width: isBar ? 90 : 120,
        height: isBar ? 90 : 120,
        minWidth: 60,
        minHeight: 60,
      };
  }
};

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 'n' | 's';

export function DraggableTable({
  table,
  billAmount,
  onSelect,
  onDragEnd,
  onResizeEnd,
  editable = false,
  isSelected = false,
  onMergeClick,
}: DraggableTableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [didDrag, setDidDrag] = useState(false);

  const [pos, setPos] = useState(() => ({
    x: table.position_x || 0,
    y: table.position_y || 0,
  }));

  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
  const tableType = table.table_type || 'dining';
  const typeConfig = TABLE_TYPE_CONFIG[tableType] || TABLE_TYPE_CONFIG.dining;
  const shapeStyles = getShapeStyles(table.shape, table.table_type);
  const isMerged = table.is_merged || (table.merged_with && table.merged_with.length > 0);

  const [size, setSize] = useState(() => ({
    width: table.width || shapeStyles.width,
    height: table.height || shapeStyles.height,
  }));

  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    handle: ResizeHandle;
    startClientX: number;
    startClientY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Sync local state with prop changes (when not actively interacting)
  useEffect(() => {
    if (isDragging || isResizing) return;
    setPos({
      x: table.position_x || 0,
      y: table.position_y || 0,
    });
    setSize({
      width: table.width || shapeStyles.width,
      height: table.height || shapeStyles.height,
    });
  }, [table.position_x, table.position_y, table.width, table.height, isDragging, isResizing, shapeStyles.width, shapeStyles.height]);

  // -------- Drag handlers --------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag="true"]') || target.closest('[data-resize-handle]')) return;

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
    if (!editable) return;

    // Handle resize
    if (isResizing && resizeRef.current && resizeRef.current.pointerId === e.pointerId) {
      const dx = e.clientX - resizeRef.current.startClientX;
      const dy = e.clientY - resizeRef.current.startClientY;
      const handle = resizeRef.current.handle;

      let newWidth = resizeRef.current.startWidth;
      let newHeight = resizeRef.current.startHeight;
      let newX = resizeRef.current.startLeft;
      let newY = resizeRef.current.startTop;

      // Calculate new dimensions based on handle
      if (handle.includes('e')) newWidth = Math.max(shapeStyles.minWidth, resizeRef.current.startWidth + dx);
      if (handle.includes('w')) {
        const delta = Math.min(dx, resizeRef.current.startWidth - shapeStyles.minWidth);
        newWidth = resizeRef.current.startWidth - delta;
        newX = resizeRef.current.startLeft + delta;
      }
      if (handle.includes('s')) newHeight = Math.max(shapeStyles.minHeight, resizeRef.current.startHeight + dy);
      if (handle.includes('n')) {
        const delta = Math.min(dy, resizeRef.current.startHeight - shapeStyles.minHeight);
        newHeight = resizeRef.current.startHeight - delta;
        newY = resizeRef.current.startTop + delta;
      }

      setSize({ width: newWidth, height: newHeight });
      setPos({ x: Math.max(0, newX), y: Math.max(0, newY) });
      return;
    }

    // Handle drag
    if (!isDragging) return;
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
    // Finish resize
    if (isResizing && resizeRef.current && resizeRef.current.pointerId === e.pointerId) {
      setIsResizing(false);
      resizeRef.current = null;
      onResizeEnd?.(size.width, size.height);
      // Also persist position if it changed (for nw/ne/sw handles)
      onDragEnd?.(pos.x, pos.y);
      return;
    }

    // Finish drag
    if (!editable || !isDragging) return;
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    const finalX = Math.max(0, dragRef.current.startLeft + dx);
    const finalY = Math.max(0, dragRef.current.startTop + dy);

    setIsDragging(false);
    dragRef.current = null;

    setPos({ x: finalX, y: finalY });
    onDragEnd?.(finalX, finalY);
  };

  // -------- Resize handlers --------
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);

    resizeRef.current = {
      pointerId: e.pointerId,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startLeft: pos.x,
      startTop: pos.y,
    };

    // Capture on parent element
    const parent = (e.target as HTMLElement).closest('[data-table-root]') as HTMLElement;
    parent?.setPointerCapture(e.pointerId);
  };

  const handleMergeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMergeClick?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (editable && (didDrag || isResizing)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelect();
  };

  const displayWidth = size.width;
  const displayHeight = size.height;

  // Resize handle positions
  const resizeHandles: { handle: ResizeHandle; className: string; cursor: string }[] = [
    { handle: 'se', className: 'bottom-0 right-0', cursor: 'cursor-se-resize' },
    { handle: 'sw', className: 'bottom-0 left-0', cursor: 'cursor-sw-resize' },
    { handle: 'ne', className: 'top-0 right-0', cursor: 'cursor-ne-resize' },
    { handle: 'nw', className: 'top-0 left-0', cursor: 'cursor-nw-resize' },
    { handle: 'e', className: 'top-1/2 -translate-y-1/2 right-0', cursor: 'cursor-e-resize' },
    { handle: 'w', className: 'top-1/2 -translate-y-1/2 left-0', cursor: 'cursor-w-resize' },
    { handle: 'n', className: 'left-1/2 -translate-x-1/2 top-0', cursor: 'cursor-n-resize' },
    { handle: 's', className: 'left-1/2 -translate-x-1/2 bottom-0', cursor: 'cursor-s-resize' },
  ];

  return (
    <div
      data-table-root
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
      onPointerCancel={finishPointerDrag}
      onClick={handleClick}
      className={cn(
        'absolute flex flex-col items-center justify-center p-2 border-2 shadow-lg transition-colors duration-200',
        shapeStyles.className,
        config.className,
        typeConfig.bgAccent,
        (isDragging || isResizing) && 'opacity-70 z-50',
        isSelected && 'ring-4 ring-primary ring-offset-2',
        editable ? 'cursor-grab active:cursor-grabbing touch-none select-none' : 'cursor-pointer',
        !isDragging && !isResizing && 'hover:shadow-xl',
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
      {/* Resize handles (only in edit mode) */}
      {editable && (
        <>
          {resizeHandles.map(({ handle, className, cursor }) => (
            <div
              key={handle}
              data-resize-handle={handle}
              onPointerDown={(e) => handleResizePointerDown(e, handle)}
              className={cn(
                'absolute w-3 h-3 bg-primary/80 border border-primary-foreground rounded-sm z-20 opacity-0 hover:opacity-100 transition-opacity',
                className,
                cursor,
                (isResizing || isSelected) && 'opacity-100'
              )}
              style={{ touchAction: 'none' }}
            />
          ))}
        </>
      )}

      {/* Merge indicator */}
      {isMerged && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white rounded-full p-1 shadow-lg z-10">
          <Merge className="h-3 w-3" />
        </div>
      )}

      {/* Drag handle */}
      {editable && (
        <div className="absolute top-1 right-1 p-0.5 rounded bg-white/50 dark:bg-black/30" data-no-drag="true">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Merge button */}
      {editable && onMergeClick && (
        <button
          onClick={handleMergeClick}
          onPointerDown={(e) => e.stopPropagation()}
          data-no-drag="true"
          className="absolute top-1 left-1 p-1 rounded bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
          title={isMerged ? 'Split tables' : 'Merge tables'}
        >
          <Merge className="h-3 w-3 text-purple-600 dark:text-purple-400" />
        </button>
      )}

      {/* Table number with type emoji */}
      <div className="flex items-center gap-1 font-bold text-sm pointer-events-none">
        <span className="text-base">{typeConfig.emoji}</span>
        <span className={config.textClass}>{table.table_number}</span>
      </div>

      {/* Bill amount */}
      {billAmount !== undefined && billAmount > 0 && (
        <div className="flex items-center gap-0.5 text-xs font-semibold animate-bill-bounce pointer-events-none">
          <span>💰</span>
          <span className="text-orange-600 dark:text-orange-400">
            {billAmount.toFixed(3)}
          </span>
        </div>
      )}

      {/* Capacity */}
      {displayHeight >= 90 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pointer-events-none">
          <Users className="h-2.5 w-2.5" />
          <span>{table.capacity}</span>
        </div>
      )}

      {/* Status badge */}
      <div className={cn(
        'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full pointer-events-none',
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
