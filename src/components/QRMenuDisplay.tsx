import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { Copy, Download, Share2 } from 'lucide-react';

interface QRMenuProps {
  restaurantUrl: string;
  tableNumber?: string;
  orderId?: string;
}

export function QRMenuDisplay({ restaurantUrl, tableNumber, orderId }: QRMenuProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);

  const generateMenuUrl = (): string => {
    const params = new URLSearchParams();
    if (tableNumber) params.append('table', tableNumber);
    if (orderId) params.append('order', orderId);

    const url = new URL(restaurantUrl);
    const base = `${url.origin}/menu`;
    return params.toString() ? `${base}?${params.toString()}` : base;
  };

  const generateQRCode = async () => {
    if (!qrCanvasRef.current) return;

    try {
      const menuUrl = generateMenuUrl();
      await QRCode.toCanvas(qrCanvasRef.current, menuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate QR code',
      });
    }
  };

  useEffect(() => {
    if (showDialog) {
      generateQRCode();
    }
  }, [showDialog]);

  const handleDownload = async () => {
    if (!qrCanvasRef.current) return;

    try {
      const link = document.createElement('a');
      link.href = qrCanvasRef.current.toDataURL('image/png');
      link.download = `menu-qr-${tableNumber || 'general'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'QR code downloaded',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download QR code',
      });
    }
  };

  const handleCopyLink = () => {
    const menuUrl = generateMenuUrl();
    navigator.clipboard.writeText(menuUrl);
    toast({
      title: 'Success',
      description: 'Menu URL copied to clipboard',
    });
  };

  const handleShare = async () => {
    const menuUrl = generateMenuUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Restaurant Menu',
          text: 'Scan or open to view our menu',
          url: menuUrl,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        <Share2 className="h-4 w-4 mr-1" />
        Menu QR
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Digital Menu QR Code</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
              <canvas ref={qrCanvasRef} />
            </div>

            <div className="text-xs text-muted-foreground text-center">
              {tableNumber && <div>📍 Table {tableNumber}</div>}
              <div>Customers can scan to view your menu</div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Menu Link
              </Button>

              <Button className="w-full" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download QR Code
              </Button>

              <Button className="w-full" variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <strong>Tip:</strong> Print this QR code and place it on your tables. Customers can scan it to view your menu or place orders directly.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QRMenuDisplay;
