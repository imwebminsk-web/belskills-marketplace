-- Taxonomies are platform-global. Drop org-scoped RLS policies, remove organization_id, recreate policies.

-- 1. Drop old dependent policies FIRST
DROP POLICY IF EXISTS "taxonomies_select" ON taxonomies;
DROP POLICY IF EXISTS "taxonomies_insert" ON taxonomies;
DROP POLICY IF EXISTS "taxonomies_update" ON taxonomies;
DROP POLICY IF EXISTS "taxonomies_delete" ON taxonomies;
DROP POLICY IF EXISTS "taxonomies_select_visible" ON taxonomies;

-- 2. Drop constraints and the column
ALTER TABLE taxonomies DROP COLUMN IF EXISTS organization_id CASCADE;

-- 3. Create new policy for public reading (only active)
CREATE POLICY "taxonomies_select_active" ON taxonomies 
FOR SELECT USING (is_active = true);

-- 4. Create new ALL operations policy for Admins (can see and manage everything)
CREATE POLICY "taxonomies_admin_all_ops" ON taxonomies 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
