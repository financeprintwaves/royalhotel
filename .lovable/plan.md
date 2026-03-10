

## Plan: Complete Single-File Database Setup + Edge Functions + Vercel Deployment Guide

### What Already Exists
The file `docs/supabase-migration.sql` (949 lines) already contains everything needed for the database:
- All 16 tables with correct schemas
- All enums (order_status, payment_status, app_role, payment_method)
- All 14 security-definer functions
- All RLS policies for every table
- All triggers (auth, order number, reservations, updated_at)
- All indexes (15 performance indexes)
- Realtime publication config
- Function grants/permissions
- Storage bucket setup

### What to Create
One updated file: `docs/supabase-migration.sql` with minor additions:
1. Add a header comment block with Vercel deployment instructions
2. Add edge function code as comments at the bottom (since edge functions can't run in SQL editor -- they need CLI deployment)
3. Add `config.toml` content for the `pin-login` function (verify_jwt = false)
4. Ensure the `REVOKE EXECUTE` on `validate_staff_pin` from `anon`/`authenticated` is included (security measure for PIN login edge function)

### Edge Functions (documented in the file, deployed via CLI)
- **pin-login**: Validates 5-digit PIN → generates magic link token via service role
- **create-staff**: Admin-only function to provision new staff accounts with roles

### Vercel Deployment Steps (included as comments)
1. Create new Supabase project at supabase.com
2. Run the SQL in SQL Editor
3. Deploy edge functions via Supabase CLI
4. Push frontend to GitHub → import in Vercel
5. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

### Changes
| File | Change |
|------|--------|
| `docs/supabase-migration.sql` | Update header with deployment guide, add REVOKE for PIN security, append edge function source code as reference comments |

This is a documentation update -- no functional code changes.

