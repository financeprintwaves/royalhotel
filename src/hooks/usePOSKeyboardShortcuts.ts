import { useEffect, useCallback } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for handling keyboard shortcuts in POS
 * F1-F9 function keys for common operations
 */
export function usePOSKeyboardShortcuts(callbacks: {
  onNewOrder?: () => void;
  onRecallOrder?: () => void;
  onCashPayment?: () => void;
  onCardPayment?: () => void;
  onBankTransfer?: () => void;
  onFindOrder?: () => void;
  onTransferOrder?: () => void;
  onVoidOrder?: () => void;
  onSettings?: () => void;
}) {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // F1 - New Order / Exit
      if (event.key === 'F1') {
        event.preventDefault();
        callbacks.onNewOrder?.();
        toast({
          title: 'F1',
          description: 'New Order',
          duration: 1000,
        });
      }

      // F2 - Recall Order
      if (event.key === 'F2') {
        event.preventDefault();
        callbacks.onRecallOrder?.();
        toast({
          title: 'F2',
          description: 'Recall Order',
          duration: 1000,
        });
      }

      // F3 - Cash Payment
      if (event.key === 'F3') {
        event.preventDefault();
        callbacks.onCashPayment?.();
        toast({
          title: 'F3',
          description: 'Cash Payment',
          duration: 1000,
        });
      }

      // F4 - Card Payment / Add Tip
      if (event.key === 'F4') {
        event.preventDefault();
        callbacks.onCardPayment?.();
        toast({
          title: 'F4',
          description: 'Card Payment / Add Tip',
          duration: 1000,
        });
      }

      // F5 - Bank Transfer
      if (event.key === 'F5') {
        event.preventDefault();
        callbacks.onBankTransfer?.();
        toast({
          title: 'F5',
          description: 'Bank Transfer',
          duration: 1000,
        });
      }

      // F6 - Find Order
      if (event.key === 'F6') {
        event.preventDefault();
        callbacks.onFindOrder?.();
        toast({
          title: 'F6',
          description: 'Find Order',
          duration: 1000,
        });
      }

      // F7 - Transfer Order
      if (event.key === 'F7') {
        event.preventDefault();
        callbacks.onTransferOrder?.();
        toast({
          title: 'F7',
          description: 'Transfer Order',
          duration: 1000,
        });
      }

      // F8 - Void Order
      if (event.key === 'F8') {
        event.preventDefault();
        callbacks.onVoidOrder?.();
        toast({
          title: 'F8',
          description: 'Void Order',
          duration: 1000,
        });
      }

      // F9 - Settings
      if (event.key === 'F9') {
        event.preventDefault();
        callbacks.onSettings?.();
        toast({
          title: 'F9',
          description: 'Settings',
          duration: 1000,
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [callbacks, toast]);
}
