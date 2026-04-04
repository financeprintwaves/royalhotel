import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useNavigate } from 'react-router-dom';
import { usePOSKeyboardShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import { usePOSWorkflow } from '@/hooks/usePOSWorkflow';
import {
  LogOut, Printer, ClipboardList, RotateCcw, Percent, Tag,
  Ban, StickyNote, HelpCircle, Banknote, CreditCard, CheckCircle,
  Pause, Play, Edit, FileText
} from 'lucide-react';
import KOTDialog from './KOTDialog';
import BillsDialog from './BillsDialog';
import PaymentDialog from './PaymentDialog';
import { printReceipt } from '@/services/printerService';

export default function POSActionPanel() {
  const { clearCart, cartItems, getOrderTotal } = usePOSContext();
  const navigate = useNavigate();
  const { printKOTMutation, handleAddItemToOrder } = usePOSWorkflow();
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showBillsDialog, setShowBillsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handlePrintKOT = async () => {
    if (cartItems.length === 0) return;
    try {
      await handleAddItemToOrder();
      await printKOTMutation.mutateAsync();
    } catch (error) {
      console.error('Print KOT failed:', error);
    }
  };

  const handlePrintBill = async () => {
    if (cartItems.length === 0) return;
    try {
      // Create mock order for printing bill
      const mockOrder = {
        order_number: `BILL${Date.now()}`,
        total_amount: getOrderTotal(),
        order_items: cartItems.map(item => ({
          menu_item: item.menuItem,
          quantity: item.quantity,
          unit_price: item.menuItem.price,
          total_price: item.menuItem.price * item.quantity,
        })),
        created_at: new Date().toISOString(),
      };
      await printReceipt(mockOrder);
      // Then open payment
      setShowPaymentDialog(true);
    } catch (error) {
      console.error('Print bill failed:', error);
    }
  };

  // Keyboard shortcuts
  usePOSKeyboardShortcuts({
    // Payment shortcuts removed
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
    { label: 'Print KOT', icon: Printer, action: handlePrintKOT, color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Print Bill', icon: FileText, action: handlePrintBill, color: 'bg-blue-600 hover:bg-blue-500' },
    { label: 'KOT', icon: ClipboardList, action: () => setShowKOTDialog(true), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Bills', icon: FileText, action: () => setShowBillsDialog(true), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Refund', icon: RotateCcw, action: () => console.log('Refund'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Tax', icon: Percent, action: () => console.log('Tax'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Discount', icon: Tag, action: () => console.log('Discount'), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Void', icon: Ban, action: () => console.log('Void'), color: 'bg-red-700 hover:bg-red-600' },
    { label: 'Note', icon: StickyNote, action: () => console.log('Note'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Help', icon: HelpCircle, action: () => console.log('Help'), color: 'bg-slate-700 hover:bg-slate-600' },
  ];


  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 p-2 gap-2">
      {/* Hold / Recall */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-1.5">
        <button
          onClick={handleHoldOrder}
          disabled={cartItems.length === 0}
          className="h-14 flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <Pause className="w-5 h-5" />
          <span className="text-[10px] leading-tight">Hold</span>
        </button>
        <button
          className="h-14 flex items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-sky-600 hover:bg-sky-500 transition-colors"
        >
          <Play className="w-5 h-5" />
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

      {showKOTDialog && <KOTDialog onClose={() => setShowKOTDialog(false)} />}
      {showBillsDialog && <BillsDialog onClose={() => setShowBillsDialog(false)} />}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
    </div>
  );
}
