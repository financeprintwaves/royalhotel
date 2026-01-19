import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/types/pos';

type RealtimeCallback = (order: Order) => void;

export function useOrdersRealtime(
  onInsert?: RealtimeCallback,
  onUpdate?: RealtimeCallback,
  onDelete?: (id: string) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order INSERT:', payload);
          if (onInsert) onInsert(payload.new as Order);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order UPDATE:', payload);
          if (onUpdate) onUpdate(payload.new as Order);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order DELETE:', payload);
          if (onDelete) onDelete((payload.old as { id: string }).id);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onInsert, onUpdate, onDelete]);
}
