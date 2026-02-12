import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Building2, Plus, Pencil, Trash2, Phone, MapPin, Hash, Upload, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllBranches, createBranch, updateBranch, deactivateBranch } from '@/services/staffService';
import { supabase } from '@/integrations/supabase/client';
import type { Branch } from '@/types/pos';

export default function BranchManagement() {
  const { profile, roles } = useAuth();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [orderPrefix, setOrderPrefix] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const isAdmin = roles.includes('admin');
  const isManager = roles.includes('manager');
  const canManage = isAdmin || isManager;

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    try {
      const data = await getAllBranches();
      setBranches(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  function openDialog(branch?: Branch) {
    if (branch) {
      setEditingBranch(branch);
      setName(branch.name);
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setOrderPrefix(branch.order_prefix || 'INB');
      setLogoPreview((branch as any).logo_url || '');
    } else {
      setEditingBranch(null);
      setName('');
      setAddress('');
      setPhone('');
      setOrderPrefix('');
      setLogoPreview('');
    }
    setLogoFile(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Branch name is required' });
      return;
    }

    // Validate order prefix (2-5 uppercase letters)
    const prefix = orderPrefix.trim().toUpperCase();
    if (prefix && !/^[A-Z]{2,5}$/.test(prefix)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Order prefix must be 2-5 uppercase letters' });
      return;
    }

    try {
      let logoUrl: string | undefined;
      
      // Upload logo if selected
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${editingBranch?.id || crypto.randomUUID()}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('branch-logos')
          .upload(filePath, logoFile, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('branch-logos')
          .getPublicUrl(filePath);
        
        logoUrl = urlData.publicUrl;
        setUploadingLogo(false);
      }

      if (editingBranch) {
        const updateData: any = {
          name: name.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        };
        if (logoUrl) updateData.logo_url = logoUrl;
        
        await updateBranch(editingBranch.id, updateData);
        toast({ title: 'Success', description: 'Branch updated' });
      } else {
        const newBranch = await createBranch(name.trim(), address.trim() || undefined, phone.trim() || undefined, prefix || 'INB');
        
        // If logo was uploaded, update the new branch with logo_url
        if (logoUrl) {
          await supabase.from('branches').update({ logo_url: logoUrl }).eq('id', newBranch.id);
        }
        
        toast({ title: 'Success', description: 'Branch created' });
      }
      setDialogOpen(false);
      loadBranches();
    } catch (error: any) {
      setUploadingLogo(false);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  function confirmDelete(branch: Branch) {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!branchToDelete) return;

    try {
      await deactivateBranch(branchToDelete.id);
      toast({ title: 'Success', description: 'Branch deactivated' });
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
      loadBranches();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  // Check if manager can edit this branch
  function canEditBranch(branch: Branch): boolean {
    if (isAdmin) return true;
    if (isManager && profile?.branch_id === branch.id) return true;
    return false;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to manage branches.
            </p>
            <Button className="w-full mt-4" asChild>
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Branch Management</h1>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />Add Branch
            </Button>
          )}
        </div>
      </header>

      {/* Dialog rendered for all managers/admins */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., Downtown Location"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+968 1234 5678"
              />
            </div>
            {!editingBranch && (
              <div className="space-y-2">
                <Label>Order Prefix (2-5 letters)</Label>
                <Input 
                  value={orderPrefix} 
                  onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())} 
                  placeholder="e.g., ARB, INB"
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground">
                  Used in order numbers (e.g., ARB2501001)
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Branch Logo</Label>
              {logoPreview && (
                <img src={logoPreview} alt="Logo preview" className="h-16 object-contain rounded border p-1" />
              )}
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload a logo for receipts (recommended: PNG, max 200KB)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingBranch ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{branches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {branches.filter(b => b.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold truncate">
                {branches.find(b => b.id === profile?.branch_id)?.name || 'Not Assigned'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branches Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Branches</CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'Manage all restaurant branches' 
                : 'View branches and edit your assigned branch'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Order Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{branch.name}</span>
                        {profile?.branch_id === branch.id && (
                          <Badge variant="secondary" className="text-xs">Your Branch</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {branch.address ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {branch.address}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {branch.phone ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {branch.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Hash className="h-3 w-3 mr-1" />
                        {branch.order_prefix}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {branch.is_active ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditBranch(branch) && (
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => openDialog(branch)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => confirmDelete(branch)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {branches.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No branches found.</p>
                {isAdmin && (
                  <Button className="mt-4" onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" />Add First Branch
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Branch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{branchToDelete?.name}"? 
              This will hide it from the system but preserve all historical data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
