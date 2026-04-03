import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories } from '@/hooks/useMenuData';
import { useResponsive } from '@/hooks/useResponsive';
import POSTableSelector from './POSTableSelector';
import POSOrderPanel from './POSOrderPanel';
import POSMenuPanel from './POSMenuPanel';
import POSActionPanel from './POSActionPanel';
import PaymentDialog from './PaymentDialog';
import KOTPrintDialog from './KOTPrintDialog';
import HoldOrdersPanel from './HoldOrdersPanel';
import { Printer, CreditCard, ShoppingCart, Pause } from 'lucide-react';

export default function POSLayout() {
  const { orderType, selectedTableName, cartItems } = usePOSContext();
  const { isLoading } = useCategories();
  const { isMobile, isTablet } = useResponsive();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showHoldOrders, setShowHoldOrders] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-sm text-slate-400">Loading menu...</div>
      </div>
    );
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <POSTableSelector compact />
            <div className="text-sm font-semibold text-white truncate flex-1 text-center">
              {orderType === 'takeout' ? 'Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-700 px-2 py-1 rounded">
              <ShoppingCart className="w-3 h-3" />
              {cartItems.length}
            </div>
          </div>
          <div className="text-center text-xl font-bold text-white mt-1 tabular-nums">
            ${cartTotal.toFixed(2)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom actions */}
        <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700 p-2 flex gap-2">
          <button
            onClick={() => setShowKOTDialog(true)}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" /> KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" /> Pay
          </button>
        </div>

        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        {/* Left: Cart */}
        <div className="w-[320px] border-r border-slate-700 bg-slate-800 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 p-3">
            <POSTableSelector />
            <div className="text-center text-xl font-bold text-white mt-2 tabular-nums">
              ${cartTotal.toFixed(2)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-2 border-t border-slate-700 space-y-1.5">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" /> Payment
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <POSMenuPanel />
        </div>

        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Desktop Layout: 3 panels
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Left: Cart (25%) */}
      <div className="w-[25%] min-w-[280px] max-w-[380px] border-r border-slate-700 bg-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <POSTableSelector />
            <div className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            ${cartTotal.toFixed(2)}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3">
          <POSOrderPanel />
        </div>

        {/* Quick actions */}
        <div className="flex-shrink-0 p-2 border-t border-slate-700 space-y-1.5">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-wide"
          >
            <Pause className="w-3.5 h-3.5" /> Hold Order
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-md font-medium text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-wide"
          >
            <Printer className="w-3.5 h-3.5" /> Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed uppercase tracking-wide"
          >
            <CreditCard className="w-4 h-4" /> Payment
          </button>
        </div>
      </div>

      {/* Center: Menu (50%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <POSMenuPanel />
      </div>

      {/* Right: Actions (25%) */}
      <div className="w-[22%] min-w-[220px] max-w-[320px] border-l border-slate-700 flex flex-col overflow-hidden">
        <POSActionPanel />
      </div>

      {/* Dialogs */}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
      {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      {showHoldOrders && <HoldOrdersPanel onClose={() => setShowHoldOrders(false)} />}
    </div>
  );
}
