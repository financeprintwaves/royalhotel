import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function POSActionPanel() {
  const functionKeys = [
    { key: 'F1', label: 'EXIT', color: 'bg-slate-600', textColor: 'text-white' },
    { key: 'F2', label: 'RECALL', color: 'bg-blue-600', textColor: 'text-white' },
    { key: 'F3', label: 'CASH', color: 'bg-red-600', textColor: 'text-white' },
    { key: 'F4', label: 'CREDIT', color: 'bg-purple-600', textColor: 'text-white' },
    { key: 'F5', label: 'TRANSFER', color: 'bg-yellow-600', textColor: 'text-white' },
    { key: 'F6', label: 'FIND', color: 'bg-green-600', textColor: 'text-white' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800">
      {/* Function Keys - Horizontal on Top */}
      <div className="flex-shrink-0 p-3 border-b border-slate-300 dark:border-slate-700 space-y-2">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">⌨️ Function Keys</div>
        <div className="grid grid-cols-6 gap-2">
          {functionKeys.map((btn) => (
            <button
              key={btn.key}
              className={`flex flex-col items-center justify-center rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${btn.color} ${btn.textColor} p-2 text-center h-14`}
              title={`${btn.key}: ${btn.label}`}
            >
              <div className="text-xs font-bold leading-tight">{btn.key}</div>
              <div className="text-[9px] leading-tight whitespace-nowrap">{btn.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="flex-shrink-0 p-4 space-y-2 border-b border-slate-300 dark:border-slate-700">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">💳 Payment Methods</div>
        <div className="space-y-2">
          <Button className="w-full h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            💰 CASH (F3)
          </Button>
          <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            💳 CREDIT CARD (F4)
          </Button>
          <Button className="w-full h-11 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            ✓ CHECK/OTHER
          </Button>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">⚙️ Quick Actions</div>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-center text-sm font-semibold py-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
