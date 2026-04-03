import React from 'react';
import { Button } from '@/components/ui/button';

export default function POSActionPanel() {
  const topButtons = [
    { id: 'hold', label: 'HOLD ORDER', icon: '⏸️', color: 'bg-slate-700', textColor: 'text-white' },
    { id: 'recall', label: 'RECALL', icon: '📋', color: 'bg-slate-700', textColor: 'text-white' },
  ];

  const functionRows = [
    [
      { key: 'F1', label: 'EXIT', icon: '🚪' },
      { key: 'F2', label: 'PRINT', icon: '🖨️' },
      { key: 'F3', label: 'SETTINGS', icon: '⚙️' },
    ],
    [
      { key: 'F4', label: 'REFUND', icon: '↩️' },
      { key: 'F5', label: 'TAX', icon: '📊' },
      { key: 'F6', label: 'DISCT', icon: '🏷️' },
    ],
    [
      { key: 'F7', label: 'VOID', icon: '✗' },
      { key: 'F8', label: 'NOTE', icon: '📝' },
      { key: 'F9', label: 'HELP', icon: '❓' },
    ],
  ];

  const paymentMethods = [
    { id: 'cash', label: 'CASH', icon: '💰', onClick: () => console.log('Cash') },
    { id: 'card', label: 'CARD', icon: '💳', onClick: () => console.log('Card') },
    { id: 'other', label: 'OTHER', icon: '✓', onClick: () => console.log('Other') },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-800 p-2 space-y-2">
      {/* Top 2 Buttons - Simple */}
      <div className="flex-shrink-0 space-y-1">
        <div className="grid grid-cols-2 gap-1">
          {topButtons.map((btn) => (
            <button
              key={btn.id}
              className="px-2 py-2 rounded font-semibold transition-colors duration-200 bg-slate-700 hover:bg-slate-600 text-white text-center text-xs uppercase tracking-wider"
              title={btn.label}
            >
              <div className="text-base leading-tight">{btn.icon}</div>
              <div className="text-xs leading-tight whitespace-nowrap">{btn.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Function Keys - 3 rows */}
      <div className="flex-shrink-0 border-t border-slate-700 pt-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Functions</div>
        <div className="space-y-1">
          {functionRows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-1">
              {row.map((btn) => (
                <button
                  key={btn.key}
                  className="flex flex-col items-center justify-center rounded font-semibold transition-colors duration-200 bg-slate-700 hover:bg-slate-600 text-white text-center py-2"
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
      <div className="flex-1 border-t border-slate-700 pt-2 flex flex-col">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Payment</div>
        <div className="grid grid-cols-1 gap-1 flex-1">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={method.onClick}
              className="h-full rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors duration-200 flex flex-col justify-center items-center p-2 text-xs uppercase tracking-wider"
            >
              <span className="text-lg">{method.icon}</span>
              <span className="mt-1">{method.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
