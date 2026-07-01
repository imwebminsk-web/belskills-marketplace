-- Add parent_id to allow subcategories
ALTER TABLE public.taxonomies
ADD COLUMN parent_id UUID REFERENCES public.taxonomies(id) ON DELETE CASCADE;

-- Create an index to speed up hierarchical queries
CREATE INDEX IF NOT EXISTS taxonomies_parent_id_idx ON public.taxonomies(parent_id);
