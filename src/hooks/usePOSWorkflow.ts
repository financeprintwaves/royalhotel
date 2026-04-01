import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { usePOSContext } from '@/contexts/POSContext';
import {
  createPOSOrder,
  addCartItemsToOrder,
  printKOT,
  processPaymentAndPrint,
  closeOrderPOS,
  holdOrderPOS,
} from '@/services/posIntegration';
import { useToast } from './use-toast';

/**
 * Hook for managing POS order workflow
 * Handles: Create order → Add items → Print KOT → Payment → Auto-print receipt
 */
export function usePOSWorkflow() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    currentOrder,
    setCurrentOrder,
    cartItems,
    clearCart,
    orderType,
    selectedTableId,
  } = usePOSContext();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create new order (happens on first item add)
   */
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error('User not authenticated');

      const order = await createPOSOrder(
        selectedTableId || null,
        orderType || 'dine-in',
        profile.branch_id,
        user.id
      );

      setCurrentOrder(order);
      return order;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create order',
        variant: 'destructive',
      });
      console.error('Create order error:', error);
    },
  });

  /**
   * Add cart items to order
   */
  const addItemsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await addCartItemsToOrder(orderId, cartItems);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add items to order',
        variant: 'destructive',
      });
      console.error('Add items error:', error);
    },
  });

  /**
   * Print KOT before payment
   */
  const printKOTMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrder) throw new Error('No order created');
      await printKOT(currentOrder, cartItems);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'KOT printed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to print KOT',
        variant: 'destructive',
      });
      console.error('Print KOT error:', error);
    },
  });

  /**
   * Process payment and auto-print receipt
   */
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      amount: number;
      method: 'cash' | 'card' | 'transfer' | 'split';
      tip?: number;
    }) => {
      if (!currentOrder) throw new Error('No order created');
      
      const payment = await processPaymentAndPrint(
        currentOrder,
        cartItems,
        paymentData
      );

      // Close order after successful payment
      await closeOrderPOS(currentOrder.id);
      
      return payment;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Payment processed and receipt printed',
      });
      
      // Clear cart for new order
      clearCart();
      setCurrentOrder(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Payment processing failed',
        variant: 'destructive',
      });
      console.error('Payment error:', error);
    },
  });

  /**
   * Hold current order
   */
  const holdOrderMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrder) throw new Error('No order created');
      await holdOrderPOS(currentOrder.id);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order held successfully',
      });
      clearCart();
      setCurrentOrder(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to hold order',
        variant: 'destructive',
      });
      console.error('Hold order error:', error);
    },
  });

  /**
   * Main workflow: Add item to order (creates if needed)
   */
  const handleAddItemToOrder = useCallback(async () => {
    if (cartItems.length === 0) return;

    try {
      setIsLoading(true);

      // Create order if it doesn't exist
      if (!currentOrder) {
        const newOrder = await createOrderMutation.mutateAsync();
        await addItemsMutation.mutateAsync(newOrder.id);
      } else {
        // Add to existing order
        await addItemsMutation.mutateAsync(currentOrder.id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentOrder, cartItems, createOrderMutation, addItemsMutation]);

  return {
    // Mutations
    createOrderMutation,
    addItemsMutation,
    printKOTMutation,
    processPaymentMutation,
    holdOrderMutation,

    // Workflow functions
    handleAddItemToOrder,

    // State
    isLoading,
  };
}
