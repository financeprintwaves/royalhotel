import React from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import CartItemRow from './CartItemRow';
import { Card } from '@/components/ui/card';

export default function POSOrderPanel() {
  const { cartItems } = usePOSContext();

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No items in cart</p>
        <p className="text-xs mt-2">Select items from menu to begin</p>
      </Card>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

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
          <span className="font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax (10%):</span>
          <span className="font-semibold">${tax.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-base font-bold">
          <span>Total:</span>
          <span className="text-lg">${total.toFixed(2)}</span>
        </div>
      </Card>
    </div>
  );
}
