-- Catalog metadata for courses (categories, tags, flags)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.taxonomies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.taxonomies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketing_tag_id UUID REFERENCES public.taxonomies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS has_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_belskills_partner BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS courses_category_id_idx ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS courses_subcategory_id_idx ON public.courses(subcategory_id);
CREATE INDEX IF NOT EXISTS courses_marketing_tag_id_idx ON public.courses(marketing_tag_id);
