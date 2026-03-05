

## Fix: Manager Can't See Orders — Race Condition in AuthContext

### Root Cause
The session replay confirms the manager (`rhbr@royalhotel.com`) **has the correct branch assignment** in the database (Royal Hyderabadi, branch_id `c39f6b77...`), and the RLS policies are correct.

The actual problem is a **race condition in AuthContext**: `setLoading(false)` fires immediately (line 107/127) BEFORE `fetchUserData()` resolves. The Dashboard renders with `profile = null`, sees no branch, and shows "No Branch Assigned." The profile eventually loads, but if the user navigates during that window, the state resets.

This means managers see the "No Branch Assigned" screen and can't access POS/Orders at all — they never get to see any Edit/Cancel buttons.

### Fix

#### 1. AuthContext — Wait for profile before setting loading=false (`src/contexts/AuthContext.tsx`)

Move `setLoading(false)` inside the `fetchUserData().then()` callback so the app stays in loading state until the profile is available:

```typescript
// onAuthStateChange handler
if (session?.user) {
  fetchUserData(session.user.id).then((profileData) => {
    if (!isMounted) return;
    if (profileData?.branch_id) {
      initializeSessionTracking(session.user.id, profileData.branch_id);
    }
    setLoading(false); // ← Move here
  }).catch(() => {
    if (isMounted) setLoading(false);
  });
} else {
  setProfile(null);
  setRoles([]);
  setLoading(false); // ← Keep here for logged-out state
}
```

Same change for the `getSession()` block.

#### 2. Dashboard — Handle edge case where profile loads slowly (`src/pages/Dashboard.tsx`)

Reset `hasBranch` to false when profile changes to null (currently it only sets to true, never resets):

```typescript
useEffect(() => {
  if (profile?.branch_id) {
    setHasBranch(true);
    loadData();
  } else {
    setHasBranch(false);
  }
}, [profile]);
```

### Files Modified
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Move `setLoading(false)` after `fetchUserData` resolves |
| `src/pages/Dashboard.tsx` | Reset `hasBranch` when profile is null |

### What This Fixes
- Manager no longer sees "No Branch Assigned" flash
- Profile, roles, and branch are all loaded before the app renders
- POS and Orders pages will have correct `isManagerOrAdmin()` from the start
- Edit/Cancel buttons (already fixed in last edit) will be visible immediately

