import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, MoreVertical } from 'lucide-react';

export default function POSActionPanel() {
  const functionKeys = [
    { key: 'F1', label: 'EXIT', color: 'bg-slate-600', textColor: 'text-white' },
    { key: 'F2', label: 'RECALL\nORDER', color: 'bg-blue-600', textColor: 'text-white' },
    { key: 'F3', label: 'CASH', color: 'bg-red-600', textColor: 'text-white' },
    { key: 'F4', label: 'FULL\nSCREEN', color: 'bg-purple-600', textColor: 'text-white' },
    { key: 'F5', label: 'TRANSFER\nORDER', color: 'bg-yellow-600', textColor: 'text-white' },
    { key: 'F6', label: 'FIND\nORDER', color: 'bg-green-600', textColor: 'text-white' },
    { key: 'F7', label: 'TRANSFER\nORDER', color: 'bg-cyan-600', textColor: 'text-white' },
    { key: 'F8', label: 'VOID\nORDER', color: 'bg-pink-600', textColor: 'text-white' },
    { key: 'F9', label: 'SETTINGS', color: 'bg-gray-700', textColor: 'text-white' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 space-y-4 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800">
      {/* Payment Methods Section */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">💳 Payment Methods</div>
        <div className="space-y-1.5">
          <Button className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            💰 CASH (F3)
          </Button>
          <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            💳 CREDIT CARD (F4)
          </Button>
          <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-sm shadow-lg transition-all duration-200">
            ✓ CHECK (F6)
          </Button>
        </div>
      </div>

      {/* Function Keys Section */}
      <div className="flex-1 flex flex-col space-y-2">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">⌨️ Function Keys</div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {functionKeys.map((btn) => (
            <button
              key={btn.key}
              className={`flex flex-col items-center justify-center rounded-lg font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${btn.color} ${btn.textColor} p-2 text-center`}
            >
              <div className="text-xs font-bold leading-tight">{btn.key}</div>
              <div className="text-[10px] leading-tight whitespace-pre-line">{btn.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div className="space-y-2 pt-2 border-t border-slate-300 dark:border-slate-700">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">⚙️ Actions</div>
        <Button variant="outline" className="w-full justify-center text-sm font-semibold py-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200">
          <Settings className="w-4 h-4 mr-2" />
          More Options
        </Button>
      </div>
    </div>
  );
}
