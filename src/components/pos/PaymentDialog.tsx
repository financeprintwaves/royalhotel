import React, { useState, useEffect } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printReceipt } from '@/services/printerService';
import { quickPayOrder } from '@/services/orderService';
import { toast } from '@/hooks/use-toast';

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
    cartItems,
    clearCart,
    currentOrder,
  } = usePOSContext();

  const [receivedAmount, setReceivedAmount] = useState('');
  const [showTipInput, setShowTipInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const orderTotal = getOrderTotal();
  const received = parseFloat(receivedAmount) || 0;
  const balance = received - orderTotal;
  const isChange = balance >= 0;
  const balanceAmount = Math.abs(balance);

  useEffect(() => {
    // Auto-fill received amount with order total for convenience
    setReceivedAmount(orderTotal.toFixed(2));
  }, [orderTotal]);

  const handleNumericInput = (digit: string) => {
    if (digit === 'clear') {
      setReceivedAmount('');
    } else if (digit === 'backspace') {
      setReceivedAmount(receivedAmount.slice(0, -1));
    } else if (digit === '00') {
      setReceivedAmount(receivedAmount + '00');
    } else {
      setReceivedAmount(receivedAmount + digit);
    }
  };

  const handleProceedPayment = async () => {
    if (received < orderTotal) {
      toast({
        title: 'Insufficient Amount',
        description: 'Received amount is less than the total amount.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      // Create order if not exists
      let orderId = currentOrder?.id;
      if (!orderId) {
        // TODO: Create order first
        console.log('Creating order...');
        orderId = 'temp-order-id'; // Mock for now
      }

      // Process payment
      const paymentResponse = await quickPayOrder(
        orderId,
        received,
        paymentMethod as any || 'cash',
        undefined,
        `Tip: $${tipAmount.toFixed(2)}`
      );

      if (paymentResponse.success) {
        // Print receipt silently
        try {
          const mockOrder = {
            ...currentOrder,
            order_number: `ORD${Date.now()}`,
            total_amount: orderTotal,
            payment_status: 'paid',
            order_items: cartItems.map(item => ({
              menu_item: item.menuItem,
              quantity: item.quantity,
              unit_price: item.menuItem.price,
              total_price: item.menuItem.price * item.quantity,
            }))
          };

          await printReceipt(mockOrder);
          toast({
            title: '✅ Payment Complete',
            description: `Order paid and receipt printed. ${isChange ? `Change: $${balanceAmount.toFixed(2)}` : ''}`,
          });
        } catch (printError) {
          console.error('Print error:', printError);
          toast({
            title: 'Payment Complete',
            description: 'Payment processed but printing failed.',
            variant: 'destructive',
          });
        }

        // Clear cart and close dialog
        clearCart();
        onClose();
      } else {
        throw new Error(paymentResponse.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'An error occurred while processing payment.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const displayReceived = receivedAmount;

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
            {/* Total Amount */}
            <Card className="p-3 bg-blue-100 border-blue-300">
              <div className="text-xs font-semibold text-blue-800">TOTAL AMOUNT</div>
              <div className="text-2xl font-bold text-blue-900">${orderTotal.toFixed(2)}</div>
            </Card>

            {/* Received Amount Input */}
            <Card className="p-3 border-2 border-green-300">
              <div className="text-xs font-semibold text-green-800 mb-2">AMOUNT RECEIVED</div>
              <Input
                value={displayReceived}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="text-2xl font-bold text-center"
                placeholder="0.00"
              />
            </Card>

            {/* Balance/Change Display */}
            <Card className={`p-3 ${isChange ? 'bg-emerald-100 border-emerald-300' : 'bg-red-100 border-red-300'}`}>
              <div className={`text-xs font-semibold ${isChange ? 'text-emerald-800' : 'text-red-800'}`}>
                {isChange ? 'CHANGE DUE' : 'REMAINING BALANCE'}
              </div>
              <div className={`text-2xl font-bold ${isChange ? 'text-emerald-900' : 'text-red-900'}`}>
                ${balanceAmount.toFixed(2)}
              </div>
            </Card>

            <NumericKeypad onInput={handleNumericInput} />
            <TipSection
              showTipInput={showTipInput}
              tipAmount={tipAmount}
              onToggle={() => setShowTipInput(!showTipInput)}
              onTipChange={setTipAmount}
            />
          </TabsContent>

          <TabsContent value="card" className="space-y-4 mt-4">
            <Card className="p-3 bg-blue-100 border-blue-300">
              <div className="text-xs font-semibold text-blue-800">TOTAL AMOUNT</div>
              <div className="text-2xl font-bold text-blue-900">${orderTotal.toFixed(2)}</div>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Card payment will be processed through payment gateway
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4 mt-4">
            <Card className="p-3 bg-blue-100 border-blue-300">
              <div className="text-xs font-semibold text-blue-800">TOTAL AMOUNT</div>
              <div className="text-2xl font-bold text-blue-900">${orderTotal.toFixed(2)}</div>
            </Card>
            <NumericKeypad onInput={handleNumericInput} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Back (F1)
          </Button>
          <Button
            onClick={handleProceedPayment}
            disabled={received < orderTotal || processing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400"
          >
            {processing ? 'Processing...' : 'Proceed Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            className={`py-2 text-lg font-semibold ${
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
