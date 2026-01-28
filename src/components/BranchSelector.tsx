import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useMenuData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import type { Branch } from '@/types/pos';

interface BranchSelectorProps {
  selectedBranchId: string | null;
  onBranchChange: (branchId: string | null) => void;
  showLabel?: boolean;
  className?: string;
}

export default function BranchSelector({
  selectedBranchId,
  onBranchChange,
  showLabel = true,
  className = '',
}: BranchSelectorProps) {
  const { profile, roles } = useAuth();
  const { data: branches = [], isLoading } = useBranches();
  const isAdmin = roles.includes('admin');

  // Get current branch name
  const currentBranch = branches.find(b => b.id === selectedBranchId);
  const userBranch = branches.find(b => b.id === profile?.branch_id);

  // Non-admins see their branch name as locked display
  if (!isAdmin) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
        {showLabel && <span className="text-sm text-muted-foreground">Branch:</span>}
        <Badge variant="secondary" className="font-medium">
          {userBranch?.name || 'Not Assigned'}
        </Badge>
      </div>
    );
  }

  // Admins get a dropdown to switch branches
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="h-4 w-4 text-muted-foreground" />
      {showLabel && <span className="text-sm text-muted-foreground">Branch:</span>}
      <Select
        value={selectedBranchId || 'all'}
        onValueChange={(v) => onBranchChange(v === 'all' ? null : v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          <SelectItem value="all">All Branches</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
