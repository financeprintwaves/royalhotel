import React from 'react';
import { Button } from '@/components/ui/button';

export default function POSActionPanel() {
  const functionKeys = [
    { key: 'F1', label: 'EXIT', color: 'bg-slate-700', textColor: 'text-white' },
    { key: 'F2', label: 'RECALL', color: 'bg-slate-600', textColor: 'text-white' },
    { key: 'F3', label: 'CASH', color: 'bg-slate-700', textColor: 'text-white' },
    { key: 'F4', label: 'CREDIT', color: 'bg-slate-600', textColor: 'text-white' },
    { key: 'F5', label: 'TRANSFER', color: 'bg-slate-700', textColor: 'text-white' },
    { key: 'F6', label: 'FIND', color: 'bg-slate-600', textColor: 'text-white' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-800">
      {/* Function Keys - 70% of top screen */}
      <div className="h-[70%] flex flex-col p-3 space-y-3 overflow-hidden border-b border-slate-700">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">⌨️ Keys</div>
        <div className="grid grid-cols-3 gap-3 flex-1">
          {functionKeys.map((btn) => (
            <button
              key={btn.key}
              className={`flex flex-col items-center justify-center rounded-md font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md ${btn.color} ${btn.textColor} text-center aspect-square`}
              title={`${btn.key}: ${btn.label}`}
            >
              <div className="text-sm font-bold leading-tight">{btn.key}</div>
              <div className="text-xs leading-tight whitespace-nowrap">{btn.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="h-[30%] flex flex-col p-3 border-t border-slate-700 space-y-2 overflow-hidden">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">💳 Pay</div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          <Button className="h-full rounded-md bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-md transition-all duration-200 flex flex-col justify-center items-center p-2 text-xs">
            <span className="text-sm">💰</span>
            <span>CASH</span>
          </Button>
          <Button className="h-full rounded-md bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-md transition-all duration-200 flex flex-col justify-center items-center p-2 text-xs">
            <span className="text-sm">💳</span>
            <span>CARD</span>
          </Button>
          <Button className="h-full rounded-md bg-slate-700 hover:bg-slate-600 text-white font-bold shadow-md transition-all duration-200 flex flex-col justify-center items-center p-2 text-xs">
            <span className="text-sm">✓</span>
            <span>OTHER</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
