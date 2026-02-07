
## Plan: Multi-Branch Assignment for Staff Members

### Overview

Enable staff members to be assigned to multiple branches simultaneously. Some users need access to 1 branch, others need 2 or more. This requires a new database table and UI changes.

### What Changes

| Component | Current State | After Change |
|-----------|--------------|--------------|
| Branch assignment | Single `branch_id` in profiles | Multiple via `user_branches` table |
| Staff Management UI | Dropdown select (1 branch) | Checkbox list (multiple branches) |
| Staff display | Shows single branch name | Shows multiple branch badges |

---

### Database Changes

Create a new junction table to store multiple branch assignments per user:

```sql
CREATE TABLE user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- Enable RLS
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own, admins can manage all
CREATE POLICY "Users can view their own branch assignments"
  ON user_branches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all branch assignments"
  ON user_branches FOR ALL
  USING (is_admin(auth.uid()));
```

The existing `profiles.branch_id` column will remain for backward compatibility (primary/default branch).

---

### UI Changes - Staff Management Page

Replace the single-select dropdown with a multi-select checkbox popover:

```text
Current:                          After:
┌────────────────────────┐       ┌────────────────────────┐
│ Select branch      ▼   │  →    │ 2 branches selected ▼  │
└────────────────────────┘       └────────────────────────┘
                                  ┌────────────────────────┐
                                  │ ☑ Arabic Bar           │
                                  │ ☑ Indian Bar           │
                                  │ ☐ New Branch           │
                                  └────────────────────────┘
```

Display selected branches as badges in the table:
```text
┌─────────────────────────────────────────────────────┐
│ Name    │ Email │ Branches                         │
├─────────┼───────┼──────────────────────────────────┤
│ John    │ ...   │ [Arabic Bar] [Indian Bar]        │
└─────────────────────────────────────────────────────┘
```

---

### File Changes

| File | Changes |
|------|---------|
| **Database** | New `user_branches` table with RLS policies |
| `src/services/staffService.ts` | Add `assignUserBranches()`, `getUserBranches()` functions |
| `src/pages/StaffManagement.tsx` | Replace dropdown with checkbox popover, update display to show multiple branches |
| `src/types/pos.ts` | Add `UserBranch` interface |

---

### Technical Details

#### New Service Functions (staffService.ts)

```typescript
// Get all branches for a user
export async function getUserBranches(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_branches')
    .select('branch_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(d => d.branch_id);
}

// Set branches for a user (replaces all existing)
export async function assignUserBranches(
  userId: string, 
  branchIds: string[]
): Promise<void> {
  // Delete existing assignments
  await supabase.from('user_branches')
    .delete().eq('user_id', userId);
  
  // Insert new assignments
  if (branchIds.length > 0) {
    const inserts = branchIds.map(bid => ({ 
      user_id: userId, branch_id: bid 
    }));
    await supabase.from('user_branches').insert(inserts);
  }
  
  // Update primary branch_id in profiles
  await supabase.from('profiles')
    .update({ branch_id: branchIds[0] || null })
    .eq('user_id', userId);
}
```

#### Updated Staff Member Type

```typescript
interface StaffMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch_id: string | null;      // Primary branch
  branch_ids: string[];          // All assigned branches
  branch_names: string[];        // Branch names for display
  roles: AppRole[];
  created_at: string;
  staff_pin?: string | null;
}
```

#### Multi-Select Checkbox Component (StaffManagement.tsx)

Uses Popover + Checkbox list pattern:
```typescript
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-48">
      {selectedBranches.length} branch(es) selected
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    {branches.map(branch => (
      <div key={branch.id} className="flex items-center gap-2">
        <Checkbox 
          checked={selectedBranches.includes(branch.id)}
          onCheckedChange={(checked) => toggleBranch(branch.id, checked)}
        />
        <Label>{branch.name}</Label>
      </div>
    ))}
  </PopoverContent>
</Popover>
```

---

### Backward Compatibility

- `profiles.branch_id` remains as the "primary" branch
- When multiple branches are assigned, the first one becomes the primary
- Existing RLS policies using `get_user_branch_id()` continue to work
- Session tracking uses primary branch from profiles

---

### Summary

| Feature | Implementation |
|---------|---------------|
| Store multiple branches | New `user_branches` junction table |
| Select multiple branches | Checkbox popover in Staff Management |
| Display branches | Multiple badges per staff member |
| Primary branch | First selected branch stored in profiles.branch_id |
