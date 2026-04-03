import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Printer, ClipboardList, RotateCcw, Percent, Tag,
  Ban, StickyNote, HelpCircle, Banknote, CreditCard, CheckCircle,
  Pause, Play
} from 'lucide-react';
import OrdersDialog from './OrdersDialog';

export default function POSActionPanel() {
  const { clearCart, addHeldOrder, cartItems, getOrderTotal, heldOrders, setCartItems } = usePOSContext();
  const navigate = useNavigate();
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);

  const handleHoldOrder = () => {
    if (cartItems.length === 0) return;
    // Store held order with items in a separate structure
    const heldData = {
      id: `hold-${Date.now()}`,
      items: cartItems,
      total: getOrderTotal(),
      createdAt: new Date().toISOString(),
    };
    // Save to localStorage for persistence
    const existing = JSON.parse(localStorage.getItem('pos_held_orders') || '[]');
    existing.push(heldData);
    localStorage.setItem('pos_held_orders', JSON.stringify(existing));
    clearCart();
  };

  const functionButtons = [
    { label: 'Exit', icon: LogOut, action: () => navigate('/'), color: 'bg-red-600 hover:bg-red-500' },
    { label: 'Print', icon: Printer, action: () => console.log('Print'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Orders', icon: ClipboardList, action: () => setShowOrdersDialog(true), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Refund', icon: RotateCcw, action: () => console.log('Refund'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Tax', icon: Percent, action: () => console.log('Tax'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Discount', icon: Tag, action: () => console.log('Discount'), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Void', icon: Ban, action: () => console.log('Void'), color: 'bg-red-700 hover:bg-red-600' },
    { label: 'Note', icon: StickyNote, action: () => console.log('Note'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Help', icon: HelpCircle, action: () => console.log('Help'), color: 'bg-slate-700 hover:bg-slate-600' },
  ];

  const paymentMethods = [
    { label: 'Cash', icon: Banknote, action: () => console.log('Cash'), color: 'bg-emerald-600 hover:bg-emerald-500' },
    { label: 'Card', icon: CreditCard, action: () => console.log('Card'), color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Other', icon: CheckCircle, action: () => console.log('Other'), color: 'bg-purple-600 hover:bg-purple-500' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 p-2 gap-2">
      {/* Hold / Recall */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleHoldOrder}
          disabled={cartItems.length === 0}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <Pause className="w-3.5 h-3.5" />
          Hold
        </button>
        <button
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-sky-600 hover:bg-sky-500 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Recall
        </button>
      </div>

      {/* Function keys */}
      <div className="flex-shrink-0 border-t border-slate-700 pt-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Functions</div>
        <div className="grid grid-cols-3 gap-1.5">
          {functionButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md font-medium text-xs text-white transition-colors ${btn.color}`}
            >
              <btn.icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="flex-1 border-t border-slate-700 pt-2 flex flex-col">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Payment</div>
        <div className="grid grid-cols-1 gap-1.5 flex-1">
          {paymentMethods.map((method) => (
            <button
              key={method.label}
              onClick={method.action}
              className={`flex items-center justify-center gap-2 rounded-md font-semibold text-sm text-white transition-colors ${method.color}`}
            >
              <method.icon className="w-5 h-5" />
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {showOrdersDialog && <OrdersDialog onClose={() => setShowOrdersDialog(false)} />}
    </div>
  );
}
