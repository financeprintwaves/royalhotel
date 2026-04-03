import React, { useMemo } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
    if (orderType === 'takeout') return 'Take Out';
    if (orderType === 'delivery') return 'Delivery';
    return selectedTableName || 'Select Table';
  }, [orderType, selectedTableName]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`${compact ? 'text-xs h-8' : 'text-sm'} bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:text-white`}
        >
          {displayText}
          <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => setOrderType('dine-in')}>
          <UtensilsCrossed className="w-4 h-4 mr-2" /> Dine In
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrderType('takeout')}>
          <ShoppingBag className="w-4 h-4 mr-2" /> Take Out
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrderType('delivery')}>
          <Truck className="w-4 h-4 mr-2" /> Delivery
        </DropdownMenuItem>

        <div className="h-px bg-border my-1" />

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
