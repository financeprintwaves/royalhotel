import React, { useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentDialogProps {
  onClose: () => void;
}

export default function PaymentDialog({ onClose }: PaymentDialogProps) {
  const {
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    tipAmount,
    setTipAmount,
    getOrderTotal,
    getBalanceRemaining,
    getChange,
  } = usePOSContext();

  const [showTipInput, setShowTipInput] = useState(false);
  const orderTotal = getOrderTotal();
  const balanceRemaining = getBalanceRemaining();
  const change = getChange();

  const handleNumericInput = (digit: string) => {
    if (digit === 'clear') {
      setAmountPaid(0);
    } else if (digit === 'backspace') {
      setAmountPaid(Math.floor(amountPaid / 10));
    } else if (digit === '00') {
      setAmountPaid(amountPaid * 100);
    } else {
      setAmountPaid(amountPaid * 10 + parseInt(digit));
    }
  };

  const handleProcessPayment = () => {
    if (amountPaid < orderTotal) {
      alert('Insufficient amount');
      return;
    }
    // Call payment service
    console.log('Processing payment:', {
      method: paymentMethod,
      amount: orderTotal,
      paid: amountPaid,
      tip: tipAmount,
      change: change,
    });
    onClose();
  };

  const displayAmountPaid = (amountPaid / 100).toFixed(2);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>

        <Tabs
          value={paymentMethod || 'cash'}
          onValueChange={(method: 'cash' | 'card' | 'transfer' | 'split') => setPaymentMethod(method)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash">Cash (F3)</TabsTrigger>
            <TabsTrigger value="card">Card (F4)</TabsTrigger>
            <TabsTrigger value="transfer">Transfer (F5)</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-4 mt-4">
            <PaymentAmountDisplay
              orderTotal={orderTotal}
              amountPaid={displayAmountPaid}
              balanceRemaining={balanceRemaining}
            />
            <NumericKeypad onInput={handleNumericInput} />
            <TipSection
              showTipInput={showTipInput}
              tipAmount={tipAmount}
              onToggle={() => setShowTipInput(!showTipInput)}
              onTipChange={setTipAmount}
            />
          </TabsContent>

          <TabsContent value="card" className="space-y-4 mt-4">
            <PaymentAmountDisplay
              orderTotal={orderTotal}
              amountPaid={displayAmountPaid}
              balanceRemaining={0}
            />
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Card payment will be processed through payment gateway
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4 mt-4">
            <PaymentAmountDisplay
              orderTotal={orderTotal}
              amountPaid={displayAmountPaid}
              balanceRemaining={balanceRemaining}
            />
            <NumericKeypad onInput={handleNumericInput} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Back (F1)
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={amountPaid < orderTotal}
            className="bg-green-600 hover:bg-green-700"
          >
            Process Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentAmountDisplay({
  orderTotal,
  amountPaid,
  balanceRemaining,
}: {
  orderTotal: number;
  amountPaid: string;
  balanceRemaining: number;
}) {
  return (
    <div className="space-y-3">
      <Card className="p-3 bg-yellow-100 border-yellow-300">
        <div className="text-xs font-semibold text-yellow-800">BEGINNING BALANCE</div>
        <div className="text-2xl font-bold text-yellow-900">${orderTotal.toFixed(2)}</div>
      </Card>

      <Card className="p-3 border-2 border-blue-300">
        <div className="text-xs font-semibold text-blue-800">AMOUNT PAID</div>
        <div className="text-3xl font-bold text-blue-900">${amountPaid}</div>
      </Card>

      <Card className="p-3 bg-green-100 border-green-300">
        <div className="text-xs font-semibold text-green-800">BALANCE REMAINING</div>
        <div className="text-2xl font-bold text-green-900">${balanceRemaining.toFixed(2)}</div>
      </Card>
    </div>
  );
}

function NumericKeypad({ onInput }: { onInput: (digit: string) => void }) {
  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '00', 'clear'],
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((row, i) =>
        row.map((key) => (
          <Button
            key={key}
            onClick={() => onInput(key)}
            className={`py-4 text-lg font-semibold ${
              key === 'clear'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            {key === 'clear' ? 'CLR' : key}
          </Button>
        ))
      )}
      <Button
        onClick={() => onInput('backspace')}
        className="col-span-3 bg-orange-500 hover:bg-orange-600 text-white py-2 text-sm"
      >
        ← BACKSPACE
      </Button>
    </div>
  );
}

function TipSection({
  showTipInput,
  tipAmount,
  onToggle,
  onTipChange,
}: {
  showTipInput: boolean;
  tipAmount: number;
  onToggle: () => void;
  onTipChange: (tip: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Button
        onClick={onToggle}
        variant="outline"
        className="w-full"
      >
        ADD TIP (F4)
      </Button>
      {showTipInput && (
        <Card className="p-3 bg-black text-white">
          <div className="text-xs font-semibold">TIP</div>
          <div className="text-2xl font-bold">${tipAmount.toFixed(2)}</div>
        </Card>
      )}
    </div>
  );
}
