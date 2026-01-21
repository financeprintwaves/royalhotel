import React, { useState } from 'react';
import type { RestaurantTable } from '@/types/pos';
import { cn } from '@/lib/utils';
import { Users, GripVertical } from 'lucide-react';

interface DraggableTableProps {
  table: RestaurantTable;
  billAmount?: number;
  onSelect: () => void;
  onDragEnd?: (x: number, y: number) => void;
  editable?: boolean;
  isSelected?: boolean;
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

export function DraggableTable({
  table,
  billAmount,
  onSelect,
  onDragEnd,
  editable = false,
  isSelected = false,
}: DraggableTableProps) {
  const [isDragging, setIsDragging] = useState(false);
  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;

  const handleDragStart = (e: React.DragEvent) => {
    if (!editable) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.setData('tableId', table.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    if (onDragEnd) {
      const canvas = document.getElementById('floor-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, e.clientX - rect.left - 60);
        const y = Math.max(0, e.clientY - rect.top - 60);
        onDragEnd(x, y);
      }
    }
  };

  const shapeClass = table.shape === 'round' 
    ? 'rounded-full' 
    : table.shape === 'rectangle' 
      ? 'rounded-lg aspect-[2/1]' 
      : 'rounded-xl';

  return (
    <div
      draggable={editable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      className={cn(
        'absolute flex flex-col items-center justify-center p-3 border-2 shadow-lg transition-all duration-200',
        shapeClass,
        config.className,
        isDragging && 'opacity-50 scale-110 rotate-2',
        isSelected && 'ring-4 ring-primary ring-offset-2',
        editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        'hover:scale-105 hover:shadow-xl',
        'min-w-[100px] min-h-[100px]'
      )}
      style={{
        left: table.position_x || 0,
        top: table.position_y || 0,
        width: table.width || 120,
        height: table.shape === 'rectangle' ? (table.height || 120) / 1.5 : (table.height || 120),
      }}
    >
      {/* Drag handle for edit mode */}
      {editable && (
        <div className="absolute top-1 right-1 p-1 rounded bg-white/50 dark:bg-black/30">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Table number with emoji */}
      <div className="flex items-center gap-1 font-bold text-lg">
        <span className="text-xl">🍽️</span>
        <span className={config.textClass}>{table.table_number}</span>
      </div>

      {/* Bill amount for occupied tables */}
      {billAmount !== undefined && billAmount > 0 && (
        <div className="flex items-center gap-1 text-sm font-semibold animate-bill-bounce mt-1">
          <span>💰</span>
          <span className="text-orange-600 dark:text-orange-400">
            {billAmount.toFixed(3)} OMR
          </span>
        </div>
      )}

      {/* Capacity */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Users className="h-3 w-3" />
        <span>{table.capacity} seats</span>
      </div>

      {/* Status badge */}
      <div className={cn(
        'flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full',
        config.className.includes('green') && 'bg-green-200/50 dark:bg-green-800/50',
        config.className.includes('orange') && 'bg-orange-200/50 dark:bg-orange-800/50',
        config.className.includes('blue') && 'bg-blue-200/50 dark:bg-blue-800/50',
        config.className.includes('yellow') && 'bg-yellow-200/50 dark:bg-yellow-800/50',
      )}>
        <span>{config.emoji}</span>
        <span className={config.textClass}>{config.label}</span>
      </div>
    </div>
  );
}
