import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Compact Grid Action Panel for Touch-Based POS
 * 
 * Features:
 * - Square buttons for touch efficiency (aspect-square)
 * - Compact 3-column grid layout for function keys
 * - 1-column grid for payment methods
 * - Color-coded buttons for quick visual recognition
 * - Full event handling and validation
 * - Responsive design for deskt/tablet
 */

export interface ActionPanelConfig {
  functionButtons: {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    color: string;
    disabled?: boolean;
  }[];
  paymentMethods: {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    color: string;
    disabled?: boolean;
  }[];
  holdAction?: () => void;
  recallAction?: () => void;
  holdDisabled?: boolean;
}

interface CompactActionPanelProps {
  config: ActionPanelConfig;
}

export function CompactActionPanel({ config }: CompactActionPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 p-2 gap-2">
      {/* Hold / Recall - 2 squares */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-1.5">
        <button
          onClick={config.holdAction}
          disabled={config.holdDisabled}
          className="aspect-square flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-5xl">⏸</span>
          <span className="text-[9px] leading-tight">Hold</span>
        </button>
        <button
          onClick={config.recallAction}
          className="aspect-square flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-md font-medium text-xs text-white bg-sky-600 hover:bg-sky-500 transition-colors"
        >
          <span className="text-5xl">▶</span>
          <span className="text-[9px] leading-tight">Recall</span>
        </button>
      </div>

      {/* Function Keys - 3x3 Grid */}
      <div className="flex-shrink-0 border-t border-slate-700 pt-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Functions</div>
        <div className="grid grid-cols-3 gap-1.5">
          {config.functionButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              disabled={btn.disabled}
              className={`aspect-square flex flex-col items-center justify-center py-2 px-1 rounded-md font-medium text-xs text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btn.color}`}
            >
              <div className="w-5 h-5 mb-0.5 flex items-center justify-center">{btn.icon}</div>
              <span className="text-[9px] leading-tight text-center">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Methods - 1xN Grid */}
      <div className="flex-1 border-t border-slate-700 pt-2 flex flex-col">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Payment</div>
        <div className="grid grid-cols-1 gap-1.5 flex-1">
          {config.paymentMethods.map((method, idx) => (
            <button
              key={idx}
              onClick={method.action}
              disabled={method.disabled}
              className={`aspect-square flex flex-col items-center justify-center rounded-md font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${method.color}`}
            >
              <div className="w-6 h-6 mb-1 flex items-center justify-center">{method.icon}</div>
              <span className="text-[10px] leading-tight">{method.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick reference for icon usage:
 * 
 * Icons should be Lucide React icons:
 * import { Printer, CreditCard, Banknote, ... } from 'lucide-react';
 * 
 * Usage:
 * <Printer className="w-5 h-5" />
 */
