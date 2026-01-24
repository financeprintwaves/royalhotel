-- =============================================
-- BRANCH-BASED ACCESS CONTROL FOR WAITERS/STAFF
-- Staff can only access tables and items from their assigned branch
-- =============================================

-- Drop existing overly permissive policies on restaurant_tables
DROP POLICY IF EXISTS "Authenticated users can view tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Users can view active tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Branch staff can view tables" ON public.restaurant_tables;

-- Drop existing overly permissive policies on menu_items
DROP POLICY IF EXISTS "Authenticated users can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Users can view active menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Branch staff can view menu items" ON public.menu_items;

-- Drop existing policies on categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Branch staff can view categories" ON public.categories;

-- =============================================
-- RESTAURANT_TABLES: Branch-restricted access
-- =============================================

-- Staff can only view tables from their assigned branch (admins see all)
CREATE POLICY "Staff can view tables in their branch"
ON public.restaurant_tables FOR SELECT
USING (
  (branch_id = get_user_branch_id(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can create tables in their branch
CREATE POLICY "Managers can create tables in their branch"
ON public.restaurant_tables FOR INSERT
WITH CHECK (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can update tables in their branch
CREATE POLICY "Managers can update tables in their branch"
ON public.restaurant_tables FOR UPDATE
USING (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only admins can delete tables
CREATE POLICY "Admins can delete tables"
ON public.restaurant_tables FOR DELETE
USING (is_admin(auth.uid()));

-- =============================================
-- MENU_ITEMS: Branch-restricted access
-- =============================================

-- Staff can only view menu items from their assigned branch (admins see all)
CREATE POLICY "Staff can view menu items in their branch"
ON public.menu_items FOR SELECT
USING (
  (branch_id = get_user_branch_id(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can create menu items in their branch
CREATE POLICY "Managers can create menu items in their branch"
ON public.menu_items FOR INSERT
WITH CHECK (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can update menu items in their branch
CREATE POLICY "Managers can update menu items in their branch"
ON public.menu_items FOR UPDATE
USING (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only admins can delete menu items
CREATE POLICY "Admins can delete menu items"
ON public.menu_items FOR DELETE
USING (is_admin(auth.uid()));

-- =============================================
-- CATEGORIES: Branch-restricted access
-- =============================================

-- Staff can only view categories from their assigned branch (admins see all)
CREATE POLICY "Staff can view categories in their branch"
ON public.categories FOR SELECT
USING (
  (branch_id = get_user_branch_id(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can create categories in their branch
CREATE POLICY "Managers can create categories in their branch"
ON public.categories FOR INSERT
WITH CHECK (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only managers/admins can update categories in their branch
CREATE POLICY "Managers can update categories in their branch"
ON public.categories FOR UPDATE
USING (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (is_admin(auth.uid()));

-- =============================================
-- INVENTORY: Branch-restricted via menu_items
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Branch staff can view inventory" ON public.inventory;

-- Staff can only view inventory for menu items in their branch
CREATE POLICY "Staff can view inventory in their branch"
ON public.inventory FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    WHERE mi.id = menu_item_id
    AND (mi.branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid()))
  )
);

-- Only managers/admins can update inventory
CREATE POLICY "Managers can update inventory in their branch"
ON public.inventory FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    WHERE mi.id = menu_item_id
    AND mi.branch_id = get_user_branch_id(auth.uid())
    AND is_manager_or_admin(auth.uid())
  )
  OR is_admin(auth.uid())
);

-- Only managers/admins can insert inventory
CREATE POLICY "Managers can insert inventory in their branch"
ON public.inventory FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    WHERE mi.id = menu_item_id
    AND mi.branch_id = get_user_branch_id(auth.uid())
    AND is_manager_or_admin(auth.uid())
  )
  OR is_admin(auth.uid())
);