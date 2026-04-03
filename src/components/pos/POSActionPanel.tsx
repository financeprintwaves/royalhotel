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
    <div className="flex flex-col h-full overflow-hidden bg-slate-800 p-3 space-y-3">
      {/* Top 2 Buttons - 20% */}
      <div className="flex-shrink-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 h-auto">
          {topButtons.map((btn) => (
            <button
              key={btn.id}
              className={`px-3 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md ${btn.color} ${btn.textColor} text-center text-xs uppercase tracking-wider`}
              title={btn.label}
            >
              <div className="text-lg leading-tight">{btn.icon}</div>
              <div className="text-xs leading-tight whitespace-nowrap">{btn.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Function Keys - 3 rows, 35% */}
      <div className="flex-shrink-0 border-t border-slate-700 pt-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">⌨️ Functions</div>
        <div className="space-y-2">
          {functionRows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-2">
              {row.map((btn) => (
                <button
                  key={btn.key}
                  className="flex flex-col items-center justify-center rounded-md font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md bg-slate-700 text-white text-center aspect-square py-2"
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

      {/* Payment Methods - 3 buttons, 40% */}
      <div className="flex-1 border-t border-slate-700 pt-3 flex flex-col">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">💳 Payment</div>
        <div className="grid grid-cols-1 gap-2 flex-1">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={method.onClick}
              className="h-full rounded-md bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-md transition-all duration-200 flex flex-col justify-center items-center p-2 text-xs uppercase tracking-wider transform hover:scale-105 active:scale-95"
            >
              <span className="text-xl">{method.icon}</span>
              <span className="mt-1">{method.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
