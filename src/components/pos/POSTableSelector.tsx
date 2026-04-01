import React, { useMemo } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RestaurantTable } from '@/types/pos';
import { useTables } from '@/hooks/useMenuData';

interface POSTableSelectorProps {
  compact?: boolean;
}

export default function POSTableSelector({ compact }: POSTableSelectorProps) {
  const { orderType, setOrderType, selectedTableName, setSelectedTable } = usePOSContext();
  const { data: tables = [] } = useTables();

  const displayText = useMemo(() => {
    if (orderType === 'takeout') return 'TAKE OUT';
    if (orderType === 'delivery') return 'DELIVERY';
    return selectedTableName || 'SELECT TABLE';
  }, [orderType, selectedTableName]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={compact ? 'text-xs h-8' : 'text-sm'}
        >
          {displayText}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {/* Order Type Options */}
        <DropdownMenuItem onClick={() => setOrderType('dine-in')}>
          Dine In
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrderType('takeout')}>
          Take Out
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrderType('delivery')}>
          Delivery
        </DropdownMenuItem>

        {/* Divider */}
        <div className="h-px bg-border my-2" />

        {/* Table Options */}
        {tables?.map((table: RestaurantTable) => (
          <DropdownMenuItem
            key={table.id}
            onClick={() => {
              setOrderType('dine-in');
              setSelectedTable(table.id, `Table ${table.table_number}`);
            }}
          >
            Table {table.table_number}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
