import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, Shield, Building2, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getStaffWithRoles, 
  getAllBranches, 
  assignRole, 
  removeRole, 
  assignUserToBranch,
  createBranch,
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
      setStaff(staffData);
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

  function getAvailableRoles(currentRoles: AppRole[]): AppRole[] {
    return ALL_ROLES.filter(role => !currentRoles.includes(role));
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
    </div>
  );
}
