import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, Shield, Building2, UserCog, KeyRound, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  getStaffWithRoles, 
  getAllBranches, 
  assignRole, 
  removeRole, 
  assignUserToBranch,
  createBranch,
  setStaffPin,
  generateUniquePin,
  type StaffMember 
} from '@/services/staffService';
import type { AppRole, Branch } from '@/types/pos';

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500',
  manager: 'bg-purple-500',
  cashier: 'bg-blue-500',
  kitchen: 'bg-green-500',
};

const ALL_ROLES: AppRole[] = ['admin', 'manager', 'cashier', 'kitchen'];

export default function StaffManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  
  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Add Staff dialog state
  const [addStaffDialogOpen, setAddStaffDialogOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffBranch, setNewStaffBranch] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<AppRole | ''>('');

  useEffect(() => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'Only admins can access this page' });
      navigate('/');
      return;
    }
    loadData();
  }, [isAdmin, navigate]);

  async function loadData() {
    try {
      const [staffData, branchesData] = await Promise.all([
        getStaffWithRoles(),
        getAllBranches(),
      ]);
      // Also fetch staff PINs
      const staffWithPins = await Promise.all(
        staffData.map(async (s) => {
          const { data } = await (await import('@/integrations/supabase/client')).supabase
            .from('profiles')
            .select('staff_pin')
            .eq('user_id', s.user_id)
            .single();
          return { ...s, staff_pin: data?.staff_pin || null };
        })
      );
      setStaff(staffWithPins);
      setBranches(branchesData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole(userId: string, role: AppRole) {
    setActionLoading(true);
    try {
      await assignRole(userId, role);
      toast({ title: 'Role Assigned', description: `${role} role has been assigned` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveRole(userId: string, role: AppRole) {
    setActionLoading(true);
    try {
      await removeRole(userId, role);
      toast({ title: 'Role Removed', description: `${role} role has been removed` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBranchChange(userId: string, branchId: string) {
    setActionLoading(true);
    try {
      await assignUserToBranch(userId, branchId === 'none' ? null : branchId);
      toast({ title: 'Branch Updated', description: 'User branch assignment updated' });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      await createBranch(newBranchName, newBranchAddress);
      toast({ title: 'Branch Created', description: `${newBranchName} has been created` });
      setBranchDialogOpen(false);
      setNewBranchName('');
      setNewBranchAddress('');
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  function openPinDialog(member: StaffMember) {
    setSelectedStaff(member);
    setPinValue(member.staff_pin || '');
    setShowPin(false);
    setPinDialogOpen(true);
  }

  async function handleGeneratePin() {
    setActionLoading(true);
    try {
      const newPin = await generateUniquePin();
      setPinValue(newPin);
      setShowPin(true);
      toast({ title: 'PIN Generated', description: 'A unique PIN has been generated. Click Save to apply.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSavePin() {
    if (!selectedStaff) return;
    
    if (pinValue && !/^\d{5}$/.test(pinValue)) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'PIN must be exactly 5 digits' });
      return;
    }
    
    setActionLoading(true);
    try {
      await setStaffPin(selectedStaff.user_id, pinValue || null);
      toast({ title: 'PIN Updated', description: pinValue ? 'Staff PIN has been set' : 'Staff PIN has been removed' });
      setPinDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePin() {
    if (!selectedStaff) return;
    setActionLoading(true);
    try {
      await setStaffPin(selectedStaff.user_id, null);
      toast({ title: 'PIN Removed', description: 'Staff PIN has been removed' });
      setPinDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newStaffEmail || !newStaffPassword || !newStaffName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Email, password, and name are required' });
      return;
    }
    
    if (newStaffPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters' });
      return;
    }
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await supabase.functions.invoke('create-staff', {
        body: {
          email: newStaffEmail,
          password: newStaffPassword,
          full_name: newStaffName,
          branch_id: newStaffBranch || undefined,
          role: newStaffRole || undefined,
        },
      });
      
      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      
      toast({ title: 'Staff Created', description: `${newStaffName} has been added successfully` });
      setAddStaffDialogOpen(false);
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffName('');
      setNewStaffBranch('');
      setNewStaffRole('');
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setActionLoading(false);
    }
  }

  function getAvailableRoles(currentRoles: AppRole[]): AppRole[] {
    return ALL_ROLES.filter(role => !currentRoles.includes(role));
  }

  function formatPin(pin: string | null | undefined): string {
    if (!pin) return 'No PIN';
    return `•••${pin.slice(-2)}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <h1 className="font-bold text-lg flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Staff Management
        </h1>
        <div className="ml-auto flex gap-2">
          {/* Add Staff Dialog */}
          <Dialog open={addStaffDialogOpen} onOpenChange={setAddStaffDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new staff account with login credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={newStaffBranch} onValueChange={setNewStaffBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Branch</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Role</Label>
                  <Select value={newStaffRole} onValueChange={(v) => setNewStaffRole(v as AppRole | '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Role</SelectItem>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create Staff Member'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Branch Dialog */}
          <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Building2 className="h-4 w-4 mr-2" />Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div className="space-y-2">
                  <Label>Branch Name *</Label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Downtown Branch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Create Branch'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Branches Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branches ({branches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => (
                <Badge key={branch.id} variant="outline" className="text-sm">
                  {branch.name}
                  {branch.address && <span className="ml-1 text-muted-foreground">• {branch.address}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Staff Members ({staff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Add Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.full_name || 'No name'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email || 'No email'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-1"
                        onClick={() => openPinDialog(member)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span className={member.staff_pin ? 'font-mono' : 'text-muted-foreground'}>
                          {formatPin(member.staff_pin)}
                        </span>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.branch_id || 'none'}
                        onValueChange={(value) => handleBranchChange(member.user_id, value)}
                        disabled={actionLoading}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Branch</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        ) : (
                          member.roles.map((role) => (
                            <Badge 
                              key={role} 
                              className={`${ROLE_COLORS[role]} text-white cursor-pointer hover:opacity-80`}
                              onClick={() => handleRemoveRole(member.user_id, role)}
                              title="Click to remove"
                            >
                              {role}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getAvailableRoles(member.roles).length > 0 && (
                        <Select
                          onValueChange={(value) => handleAssignRole(member.user_id, value as AppRole)}
                          disabled={actionLoading}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableRoles(member.roles).map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* PIN Management Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Manage Staff PIN
            </DialogTitle>
            <DialogDescription>
              Set a 5-digit PIN for {selectedStaff?.full_name || selectedStaff?.email || 'this staff member'} to enable quick login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>5-Digit PIN</Label>
              <div className="flex gap-2">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={pinValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setPinValue(value);
                  }}
                  placeholder="Enter 5 digits"
                  className="font-mono text-lg tracking-widest"
                  maxLength={5}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? '🙈' : '👁️'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {pinValue.length}/5 digits
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGeneratePin}
              disabled={actionLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Random PIN
            </Button>
          </div>
          <DialogFooter className="flex gap-2">
            {selectedStaff?.staff_pin && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemovePin}
                disabled={actionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove PIN
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSavePin}
              disabled={actionLoading || (pinValue.length > 0 && pinValue.length !== 5)}
            >
              {actionLoading ? 'Saving...' : 'Save PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
