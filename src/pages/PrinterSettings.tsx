import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Printer, Save } from 'lucide-react';
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
      // Silently handle error
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
              Printer Configuration
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
                    Configure your printer settings here.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Printing Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable/disable printing features
                    </p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
