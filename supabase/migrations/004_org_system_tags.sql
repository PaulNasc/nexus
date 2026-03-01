-- ============================================================
-- ORG SYSTEM TAGS + NOTES.SYSTEM_TAG_ID
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_system_tags (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00D4AA',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_org_system_tags_org_id ON public.org_system_tags(org_id);
CREATE INDEX IF NOT EXISTS idx_org_system_tags_org_id_active ON public.org_system_tags(org_id, is_active);

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS system_tag_id BIGINT REFERENCES public.org_system_tags(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notes_system_tag_id ON public.notes(system_tag_id);

-- Keep updated_at fresh on updates
CREATE OR REPLACE FUNCTION public.touch_org_system_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_org_system_tags_updated_at ON public.org_system_tags;
CREATE TRIGGER trg_touch_org_system_tags_updated_at
BEFORE UPDATE ON public.org_system_tags
FOR EACH ROW EXECUTE FUNCTION public.touch_org_system_tags_updated_at();

ALTER TABLE public.org_system_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view org system tags" ON public.org_system_tags;
CREATE POLICY "Members can view org system tags" ON public.org_system_tags
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can insert org system tags" ON public.org_system_tags;
CREATE POLICY "Admins can insert org system tags" ON public.org_system_tags
  FOR INSERT WITH CHECK (
    public.is_org_admin_or_owner(org_id, auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update org system tags" ON public.org_system_tags;
CREATE POLICY "Admins can update org system tags" ON public.org_system_tags
  FOR UPDATE USING (public.is_org_admin_or_owner(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can delete org system tags" ON public.org_system_tags;
CREATE POLICY "Admins can delete org system tags" ON public.org_system_tags
  FOR DELETE USING (public.is_org_admin_or_owner(org_id, auth.uid()));
