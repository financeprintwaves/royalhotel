import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import OrdersDialog from './OrdersDialog';

export default function POSActionPanel() {
  const { clearCart, addHeldOrder, cartItems, getOrderTotal, heldOrders, setCartItems } = usePOSContext();
  const navigate = useNavigate();
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);

  const handleHoldOrder = () => {
    if (cartItems.length === 0) return;

    const order = {
      id: `hold-${Date.now()}`,
      order_number: `H${Date.now()}`,
      order_status: 'HOLD' as const,
      total_amount: getOrderTotal(),
      items: cartItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addHeldOrder(order);
    clearCart();
  };

  const handleRecallOrder = () => {
    // This will be handled by the HoldOrdersPanel
    // For now, just show a message
    console.log('Recall order functionality');
  };

  const functionRows = [
    [
      { key: 'F1', label: 'EXIT', icon: '🚪', action: () => navigate('/') },
      { key: 'F2', label: 'PRINT', icon: '🖨️', action: () => console.log('Print') },
      { key: 'F3', label: 'ORDERS', icon: '📋', action: () => setShowOrdersDialog(true) },
    ],
    [
      { key: 'F4', label: 'REFUND', icon: '↩️', action: () => console.log('Refund') },
      { key: 'F5', label: 'TAX', icon: '📊', action: () => console.log('Tax settings') },
      { key: 'F6', label: 'DISCT', icon: '🏷️', action: () => console.log('Discount') },
    ],
    [
      { key: 'F7', label: 'VOID', icon: '✗', action: () => console.log('Void order') },
      { key: 'F8', label: 'NOTE', icon: '📝', action: () => console.log('Add note') },
      { key: 'F9', label: 'HELP', icon: '❓', action: () => console.log('Help') },
    ],
  ];

  const paymentMethods = [
    { id: 'cash', label: 'CASH', icon: '💰', action: () => console.log('Cash payment') },
    { id: 'card', label: 'CARD', icon: '💳', action: () => console.log('Card payment') },
    { id: 'other', label: 'OTHER', icon: '✓', action: () => console.log('Other payment') },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-blue-800 p-2 space-y-2">
      {/* Top 2 Buttons - Simple */}
      <div className="flex-shrink-0 space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={handleHoldOrder}
            disabled={cartItems.length === 0}
            className="aspect-square rounded font-semibold transition-colors duration-200 bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 disabled:cursor-not-allowed text-white text-center text-xs uppercase tracking-wider flex items-center justify-center"
            title="Hold Order"
          >
            <div className="text-base leading-tight">⏸️</div>
          </button>
          <button
            onClick={handleRecallOrder}
            className="aspect-square rounded font-semibold transition-colors duration-200 bg-blue-700 hover:bg-blue-600 text-white text-center text-xs uppercase tracking-wider flex items-center justify-center"
            title="Recall Order"
          >
            <div className="text-base leading-tight">📋</div>
          </button>
        </div>
      </div>

      {/* Function Keys - 3 rows */}
      <div className="flex-shrink-0 border-t border-blue-700 pt-2">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Functions</div>
        <div className="space-y-1">
          {functionRows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-1">
              {row.map((btn) => (
                <button
                  key={btn.key}
                  onClick={btn.action}
                  className="aspect-square flex flex-col items-center justify-center rounded font-semibold transition-colors duration-200 bg-blue-700 hover:bg-blue-600 text-white text-center py-2"
                  title={`${btn.key}: ${btn.label}`}
                >
                  <div className="text-sm leading-tight">{btn.icon}</div>
                  <div className="text-xs leading-tight">{btn.label}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods - 3 buttons */}
      <div className="flex-1 border-t border-blue-700 pt-2 flex flex-col">
        <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Payment</div>
        <div className="grid grid-cols-1 gap-1 flex-1">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={method.action}
              className="h-full aspect-square rounded bg-blue-700 hover:bg-blue-600 text-white font-semibold transition-colors duration-200 flex flex-col justify-center items-center p-2 text-xs uppercase tracking-wider"
            >
              <span className="text-lg">{method.icon}</span>
              <span className="mt-1">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Dialog */}
      {showOrdersDialog && <OrdersDialog onClose={() => setShowOrdersDialog(false)} />}
    </div>
  );
}
