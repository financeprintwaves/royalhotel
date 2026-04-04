import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useNavigate } from 'react-router-dom';
import { usePOSKeyboardShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import {
  LogOut, Printer, ClipboardList, RotateCcw, Percent, Tag,
  Ban, StickyNote, HelpCircle, Banknote, CreditCard, CheckCircle,
  Pause, Play, Edit, FileText
} from 'lucide-react';
import KOTDialog from './KOTDialog';
import BillsDialog from './BillsDialog';
import PaymentDialog from './PaymentDialog';

export default function POSActionPanel() {
  const { clearCart, cartItems, getOrderTotal, setPaymentMethod } = usePOSContext();
  const navigate = useNavigate();
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showBillsDialog, setShowBillsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Keyboard shortcuts
  usePOSKeyboardShortcuts({
    onCashPayment: () => { setPaymentMethod('cash'); setShowPaymentDialog(true); },
    onCardPayment: () => { setPaymentMethod('card'); setShowPaymentDialog(true); },
    onBankTransfer: () => { setPaymentMethod('transfer'); setShowPaymentDialog(true); },
  });

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
    { label: 'KOT', icon: ClipboardList, action: () => setShowKOTDialog(true), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Bills', icon: FileText, action: () => setShowBillsDialog(true), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Refund', icon: RotateCcw, action: () => console.log('Refund'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Tax', icon: Percent, action: () => console.log('Tax'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Discount', icon: Tag, action: () => console.log('Discount'), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Void', icon: Ban, action: () => console.log('Void'), color: 'bg-red-700 hover:bg-red-600' },
    { label: 'Note', icon: StickyNote, action: () => console.log('Note'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Help', icon: HelpCircle, action: () => console.log('Help'), color: 'bg-slate-700 hover:bg-slate-600' },
  ];

  const paymentMethods = [
    { label: 'Cash', icon: Banknote, action: () => { setPaymentMethod('cash'); setShowPaymentDialog(true); }, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { label: 'Card', icon: CreditCard, action: () => { setPaymentMethod('card'); setShowPaymentDialog(true); }, color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'Other', icon: CheckCircle, action: () => { setPaymentMethod('transfer'); setShowPaymentDialog(true); }, color: 'bg-purple-600 hover:bg-purple-500' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 p-2 gap-2">
      {/* Hold / Recall */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleHoldOrder}
          disabled={cartItems.length === 0}
          className="aspect-square flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <Pause className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Hold</span>
        </button>
        <button
          className="aspect-square flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-sky-600 hover:bg-sky-500 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span className="text-[10px] leading-tight">Recall</span>
        </button>
      </div>

      {/* Function keys - Compact Grid */}
      <div className="flex-shrink-0 border-t border-slate-700 pt-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Functions</div>
        <div className="grid grid-cols-3 gap-1.5">
          {functionButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`aspect-square flex flex-col items-center justify-center py-2 px-1 rounded-md font-medium text-xs text-white transition-colors ${btn.color}`}
            >
              <btn.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] leading-tight text-center">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment - Compact Grid */}
      <div className="flex-1 border-t border-slate-700 pt-2 flex flex-col">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Payment</div>
        <div className="grid grid-cols-1 gap-1.5 flex-1">
          {paymentMethods.map((method) => (
            <button
              key={method.label}
              onClick={method.action}
              className={`aspect-square flex flex-col items-center justify-center rounded-md font-semibold text-sm text-white transition-colors ${method.color}`}
            >
              <method.icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] leading-tight">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showKOTDialog && <KOTDialog onClose={() => setShowKOTDialog(false)} />}
      {showBillsDialog && <BillsDialog onClose={() => setShowBillsDialog(false)} />}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
    </div>
  );
}
