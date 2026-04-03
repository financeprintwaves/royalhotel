import React, { useEffect, useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories, useMenuItems } from '@/hooks/useMenuData';
import { useResponsive } from '@/hooks/useResponsive';
import POSTableSelector from './POSTableSelector';
import POSOrderPanel from './POSOrderPanel';
import POSMenuPanel from './POSMenuPanel';
import POSActionPanel from './POSActionPanel';
import PaymentDialog from './PaymentDialog';
import KOTPrintDialog from './KOTPrintDialog';
import HoldOrdersPanel from './HoldOrdersPanel';

export default function POSLayout() {
  const { orderType, selectedTableId, selectedTableName, cartItems, currentOrder } =
    usePOSContext();
  const { data: categories = [], isLoading } = useCategories();
  const { deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showHoldOrders, setShowHoldOrders] = useState(false);

  // Initialize order on table selection
  useEffect(() => {
    if (!currentOrder && selectedTableId) {
      // Order will be created when first item is added
    }
  }, [selectedTableId, currentOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg text-muted-foreground">Loading menu...</div>
      </div>
    );
  }

  // Mobile Layout: Single column with drawers (320px - 767px)
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-300 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700 p-3 md:p-4 rounded-b-lg shadow-md">
          <div className="flex items-center justify-between gap-2 md:gap-3 mb-2">
            <POSTableSelector compact />
            <div className="text-sm md:text-base font-bold text-white truncate">
              {orderType === 'takeout' ? '🛍️ Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="text-xs md:text-sm text-blue-100 bg-blue-500/40 px-2 py-1 rounded-md font-semibold">
              {cartItems.length} items
            </div>
          </div>
          <div className="text-right text-2xl font-bold text-white tabular-nums">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom Controls */}
        <div className="flex-shrink-0 border-t border-slate-300 dark:border-slate-700 bg-gradient-to-t from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-3 md:p-4 space-y-3 rounded-t-lg shadow-xl">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🖨️ Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
              💳 Payment
            </button>
          </div>
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Tablet Layout: 2 columns with overlays (768px - 1023px)
  if (isTablet) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        {/* Left: Order Panel + Cart */}
        <div className="w-1/3 border-r border-slate-300 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 flex flex-col overflow-hidden rounded-r-lg shadow-lg">
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-br-lg shadow-md">
            <POSTableSelector />
            <div className="text-right text-2xl font-bold text-white mt-2 tabular-nums">
              ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-4 border-t border-slate-300 dark:border-slate-700 space-y-3 rounded-t-lg bg-gradient-to-t from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🖨️ Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
              💳 Payment
            </button>
          </div>
        </div>

        {/* Right: Menu */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-l-lg">
          <POSMenuPanel />
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Desktop Layout: 4 columns - Futuristic Design
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 dark:from-black dark:via-slate-900 dark:to-black overflow-hidden relative">
      {/* Ambient background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"></div>
      {/* Left Sidebar: Order Summary + Hold Orders */}
      <div className="w-72 border-r border-slate-700 dark:border-slate-700 bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-black flex flex-col overflow-hidden shadow-2xl relative">
        {/* Accent glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
        {/* Header with Total - Futuristic Style */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700 p-5 rounded-br-2xl shadow-2xl relative overflow-hidden">
          {/* Animated accent line */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-blue-400/20 blur-xl"></div>
          <div className="relative">
            <h2 className="text-xs font-black text-blue-100 uppercase tracking-widest">💰 SALE TOTAL</h2>
            <div className="text-5xl font-black text-white mt-3 tabular-nums tracking-tight drop-shadow-lg">
              ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
            </div>
            <p className="text-cyan-200 text-sm mt-2 font-semibold">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in order</p>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-4 relative z-10">
          <POSOrderPanel />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700 space-y-3 rounded-t-2xl bg-gradient-to-t from-slate-900 via-slate-850 to-slate-800 relative z-10">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-slate-900 rounded-xl font-bold transition-all duration-300 min-h-[44px] shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 text-sm uppercase tracking-wider drop-shadow"
          >
            ⏸️ Hold Orders
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-700 text-white rounded-xl font-bold transition-all duration-300 min-h-[44px] shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 text-sm uppercase tracking-wider drop-shadow"
          >
            🖨️ Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 hover:from-green-700 hover:via-emerald-600 hover:to-teal-700 disabled:from-slate-600 disabled:via-slate-500 disabled:to-slate-600 disabled:hover:from-slate-600 disabled:hover:via-slate-500 disabled:hover:to-slate-600 text-white rounded-xl font-bold transition-all duration-300 min-h-[44px] shadow-lg hover:shadow-2xl transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed text-sm uppercase tracking-wider drop-shadow"
          >
            💳 Payment
          </button>
        </div>
      </div>

      {/* Center-Left: Category Navigation */}
      <div className="w-64 border-r border-slate-700 bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 flex flex-col overflow-hidden shadow-xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <POSMenuPanel showCategoriesOnly />
        </div>
      </div>

      {/* Center-Right: Menu Items Grid - Main Focus */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/8 via-transparent to-cyan-500/5 pointer-events-none"></div>
        <div className="relative z-10 h-full">
          <POSMenuPanel hideCategoryBar />
        </div>
      </div>

      {/* Right Sidebar: Payment + Function Buttons */}
      <div className="w-64 border-l border-slate-700 bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 flex flex-col overflow-hidden shadow-2xl rounded-l-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10 h-full">
          <POSActionPanel />
        </div>
      </div>

      {/* Dialogs */}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
      {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      {showHoldOrders && <HoldOrdersPanel onClose={() => setShowHoldOrders(false)} />}
    </div>
  );
}
