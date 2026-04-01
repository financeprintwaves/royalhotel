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
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-card p-3 md:p-4 rounded-b-lg">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <POSTableSelector compact />
            <div className="text-sm md:text-base font-semibold truncate">
              {orderType === 'takeout' ? 'Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {cartItems.length} items
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom Controls */}
        <div className="flex-shrink-0 border-t bg-card p-3 md:p-4 space-y-3 rounded-t-lg">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 min-h-[44px]"
            >
              Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 min-h-[44px]"
            >
              Payment
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
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Left: Order Panel + Cart */}
        <div className="w-1/3 border-r bg-card flex flex-col overflow-hidden rounded-r-lg">
          <POSTableSelector />
          <div className="flex-1 overflow-y-auto">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-4 border-t space-y-3 rounded-t-lg">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 min-h-[44px]"
            >
              Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-colors duration-200 min-h-[44px]"
            >
              Payment
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

  // Desktop Layout: 4 columns
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar: Order Summary + Hold Orders */}
      <div className="w-60 border-r bg-card flex flex-col overflow-hidden rounded-r-lg">
        <div className="flex-shrink-0 p-4 border-b rounded-br-lg">
          <h2 className="text-lg font-bold text-green-600">SALE TOTAL</h2>
          <div className="text-3xl font-bold text-white mt-1">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          <POSOrderPanel />
        </div>

        <div className="flex-shrink-0 p-4 border-t space-y-3 rounded-t-lg">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg md:rounded-xl text-sm font-semibold transition-colors duration-200 min-h-[44px]"
          >
            Hold Orders
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-xl text-sm font-semibold transition-colors duration-200 min-h-[44px]"
          >
            Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white rounded-lg md:rounded-xl text-sm font-semibold transition-colors duration-200 min-h-[44px]"
          >
            Payment
          </button>
        </div>
      </div>

      {/* Center-Left: Category Navigation */}
      <div className="w-56 border-r bg-background flex flex-col overflow-hidden">
        <POSMenuPanel showCategoriesOnly />
      </div>

      {/* Center-Right: Menu Items Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <POSMenuPanel />
      </div>

      {/* Right Sidebar: Payment + Function Buttons */}
      <div className="w-56 border-l bg-card flex flex-col overflow-hidden rounded-l-lg">
        <POSActionPanel />
      </div>

      {/* Dialogs */}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
      {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      {showHoldOrders && <HoldOrdersPanel onClose={() => setShowHoldOrders(false)} />}
    </div>
  );
}
