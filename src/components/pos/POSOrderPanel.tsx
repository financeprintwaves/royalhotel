import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import CartItemRow from './CartItemRow';
import { Card } from '@/components/ui/card';

export default function POSOrderPanel() {
  const { cartItems, getOrderSubtotal, getOrderTax, currentOrder } = usePOSContext();

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No items in cart</p>
        <p className="text-xs mt-2">Select items from menu to begin</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Order Items</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {cartItems.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Totals */}
      <Card className="p-3 space-y-2 bg-muted">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span className="font-semibold">${getOrderSubtotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax (10%):</span>
          <span className="font-semibold">${getOrderTax().toFixed(2)}</span>
        </div>
        {currentOrder?.discount ? (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount:</span>
            <span className="font-semibold">-${currentOrder.discount.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="border-t pt-2 flex justify-between text-base font-bold">
          <span>Total:</span>
          <span className="text-lg">${(getOrderSubtotal() + getOrderTax() - (currentOrder?.discount || 0)).toFixed(2)}</span>
        </div>
      </Card>
    </div>
  );
}
