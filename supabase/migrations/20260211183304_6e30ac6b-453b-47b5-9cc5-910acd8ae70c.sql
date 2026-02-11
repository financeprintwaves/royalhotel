
-- 1. Add portion_name column to order_items
ALTER TABLE public.order_items ADD COLUMN portion_name TEXT DEFAULT NULL;

-- 2. Add logo_url column to branches
ALTER TABLE public.branches ADD COLUMN logo_url TEXT DEFAULT NULL;

-- 3. Create branch-logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('branch-logos', 'branch-logos', true);

-- 4. Allow public read access to branch logos
CREATE POLICY "Branch logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-logos');

-- 5. Allow admins to upload branch logos
CREATE POLICY "Admins can upload branch logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branch-logos' AND public.is_admin(auth.uid()));

-- 6. Allow admins to update branch logos
CREATE POLICY "Admins can update branch logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branch-logos' AND public.is_admin(auth.uid()));

-- 7. Allow admins to delete branch logos
CREATE POLICY "Admins can delete branch logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'branch-logos' AND public.is_admin(auth.uid()));
