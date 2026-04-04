import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useNavigate } from 'react-router-dom';
import { usePOSKeyboardShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import {
  LogOut, RotateCcw, Percent, Tag,
  Ban, StickyNote, HelpCircle, ClipboardList, FileText
} from 'lucide-react';
import KOTDialog from './KOTDialog';
import BillsDialog from './BillsDialog';

export default function POSActionPanel() {
  const { cartItems } = usePOSContext();
  const navigate = useNavigate();
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showBillsDialog, setShowBillsDialog] = useState(false);

  usePOSKeyboardShortcuts({});

  const functionButtons = [
    { label: 'Exit', icon: LogOut, action: () => navigate('/'), color: 'bg-red-600 hover:bg-red-500' },
    { label: 'KOT List', icon: ClipboardList, action: () => setShowKOTDialog(true), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Bills', icon: FileText, action: () => setShowBillsDialog(true), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Refund', icon: RotateCcw, action: () => console.log('Refund'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Tax', icon: Percent, action: () => console.log('Tax'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Discount', icon: Tag, action: () => console.log('Discount'), color: 'bg-amber-600 hover:bg-amber-500' },
    { label: 'Void', icon: Ban, action: () => console.log('Void'), color: 'bg-red-700 hover:bg-red-600' },
    { label: 'Note', icon: StickyNote, action: () => console.log('Note'), color: 'bg-slate-700 hover:bg-slate-600' },
    { label: 'Help', icon: HelpCircle, action: () => console.log('Help'), color: 'bg-slate-700 hover:bg-slate-600' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900 p-2 gap-2">
      {/* Function keys */}
      <div className="flex-shrink-0">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Functions</div>
        <div className="grid grid-cols-3 gap-1.5">
          {functionButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`aspect-square flex flex-col items-center justify-center py-2 px-1 rounded-md font-medium text-xs text-white transition-colors ${btn.color}`}
            >
              <btn.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] leading-tight text-center">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showKOTDialog && <KOTDialog onClose={() => setShowKOTDialog(false)} />}
      {showBillsDialog && <BillsDialog onClose={() => setShowBillsDialog(false)} />}
    </div>
  );
}
