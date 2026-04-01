import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, MoreVertical } from 'lucide-react';

export default function POSActionPanel() {
  const functionKeys = [
    { key: 'F1', label: 'EXIT', color: 'bg-white' },
    { key: 'F2', label: 'RECALL\nORDER', color: 'bg-white' },
    { key: 'F3', label: 'CASH', color: 'bg-red-600' },
    { key: 'F4', label: 'FULL\nSCREEN', color: 'bg-white' },
    { key: 'F5', label: 'TRANSFER\nORDER', color: 'bg-white' },
    { key: 'F6', label: 'FIND\nORDER', color: 'bg-white' },
    { key: 'F7', label: 'TRANSFER\nORDER', color: 'bg-white' },
    { key: 'F8', label: 'VOID\nORDER', color: 'bg-white' },
    { key: 'F9', label: 'SETTINGS', color: 'bg-gray-600' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 space-y-3">
      {/* Payment Methods */}
      <Card className="p-2 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground px-2">PAYMENT</div>
        <Button className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
          CASH (F3)
        </Button>
        <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
          CREDIT CARD (F4)
        </Button>
        <Button className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-bold text-sm">
          CHECK (F6)
        </Button>
      </Card>

      {/* Function Keys Grid */}
      <Card className="p-2 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">FUNCTIONS</div>
        <div className="grid grid-cols-2 gap-1">
          {functionKeys.map((btn) => (
            <Button
              key={btn.key}
              variant="outline"
              className={`h-12 text-xs font-semibold flex flex-col ${btn.color}`}
            >
              <div className="text-xs">{btn.key}</div>
              <div className="text-xs leading-tight">{btn.label}</div>
            </Button>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-2 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground px-2">ACTIONS</div>
        <Button variant="outline" className="w-full justify-start text-xs">
          <Settings className="w-4 h-4 mr-2" />
          Options
        </Button>
      </Card>
    </div>
  );
}
