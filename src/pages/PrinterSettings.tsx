import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Printer, Save, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function PrinterSettings() {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const [printerName, setPrinterName] = useState('POS_PRINTER');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const isAdminOrManager = roles.includes('admin') || roles.includes('manager');

  useEffect(() => {
    if (profile?.branch_id) loadSettings();
  }, [profile?.branch_id]);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('branch_id', profile!.branch_id!)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setPrinterName(data.printer_name);
        setIsEnabled(data.is_enabled);
      }
    } catch (err: any) {
      console.error('Failed to load printer settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile?.branch_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('printer_settings')
        .upsert({
          branch_id: profile.branch_id,
          printer_name: printerName.trim() || 'POS_PRINTER',
          is_enabled: isEnabled,
        }, { onConflict: 'branch_id' });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Printer settings updated successfully' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPrint() {
    setTesting(true);
    try {
      const html = `
<div style="width:280px;font-family:'Courier New',monospace;font-size:13px;padding:8px;text-align:center">
  <div style="font-weight:bold;font-size:15px">*** TEST PRINT ***</div>
  <div style="margin:8px 0">Printer: ${printerName}</div>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <div>If you can read this,</div>
  <div>your printer is working!</div>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <div style="font-size:11px">${new Date().toLocaleString('en-GB')}</div>
</div>`;

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('http://localhost:3001/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, printerName: printerName.trim() || 'POS_PRINTER' }),
        signal: controller.signal,
      });
      clearTimeout(id);

      if (!res.ok) throw new Error(`Daemon responded ${res.status}`);
      toast({ title: 'Test Sent', description: 'Test page sent to printer' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Test Failed', description: 'Local print daemon is not running. Please start it and try again.' });
    } finally {
      setTesting(false);
    }
  }

  if (!isAdminOrManager) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin or Manager role required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Printer Settings</h1>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Thermal Printer Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="printerName">Printer Name</Label>
                  <Input
                    id="printerName"
                    value={printerName}
                    onChange={e => setPrinterName(e.target.value)}
                    placeholder="POS_PRINTER"
                  />
                  <p className="text-xs text-muted-foreground">
                    The exact name of your thermal printer as shown in your OS printer settings.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Print Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically print KOT and invoices
                    </p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button variant="outline" onClick={handleTestPrint} disabled={testing}>
                    <TestTube className="h-4 w-4 mr-2" />
                    {testing ? 'Printing...' : 'Test Print'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
