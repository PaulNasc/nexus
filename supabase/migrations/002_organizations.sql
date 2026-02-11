-- ============================================================
-- Nexus — Organizations / Multi-Tenant Schema
-- Migration 002: Organizations, Members, Invites, Join Requests
-- ============================================================

-- 1. PROFILES (public mirror of auth.users for cross-user queries)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, display_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS public.org_members (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- 4. ORGANIZATION INVITES (by email)
CREATE TABLE IF NOT EXISTS public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(org_id, invited_email, status)
);

-- 5. JOIN REQUESTS (user requests to join an org by name+ID)
CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id, status)
);

-- ============================================================
-- ADD organization_id TO EXISTING DATA TABLES
-- Nullable so existing personal data continues to work
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.timer_stats
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON public.org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.org_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_org_id ON public.org_join_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_user_id ON public.org_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_org_id ON public.notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_org_id ON public.categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_timer_stats_org_id ON public.timer_stats(organization_id);

-- ============================================================
-- HELPER FUNCTION: check if user is member of an org
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = check_org_id AND user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(check_org_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = check_org_id AND user_id = check_user_id AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations
  FOR SELECT USING (
    public.is_org_member(id, auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can view org by slug for join requests" ON public.organizations;
CREATE POLICY "Anyone can view org by slug for join requests" ON public.organizations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update org" ON public.organizations;
CREATE POLICY "Owner can update org" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner can delete org" ON public.organizations;
CREATE POLICY "Owner can delete org" ON public.organizations
  FOR DELETE USING (owner_id = auth.uid());

-- ORG_MEMBERS
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view org members" ON public.org_members;
CREATE POLICY "Members can view org members" ON public.org_members
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can insert members" ON public.org_members;
CREATE POLICY "Admins can insert members" ON public.org_members
  FOR INSERT WITH CHECK (
    public.is_org_admin_or_owner(org_id, auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update members" ON public.org_members;
CREATE POLICY "Admins can update members" ON public.org_members
  FOR UPDATE USING (public.is_org_admin_or_owner(org_id, auth.uid()));

DROP POLICY IF EXISTS "Members can leave or admins can remove" ON public.org_members;
CREATE POLICY "Members can leave or admins can remove" ON public.org_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_org_admin_or_owner(org_id, auth.uid())
  );

-- ORG_INVITES
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view org invites" ON public.org_invites;
CREATE POLICY "Admins can view org invites" ON public.org_invites
  FOR SELECT USING (
    public.is_org_admin_or_owner(org_id, auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can create invites" ON public.org_invites;
CREATE POLICY "Admins can create invites" ON public.org_invites
  FOR INSERT WITH CHECK (public.is_org_admin_or_owner(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can update invites" ON public.org_invites;
CREATE POLICY "Admins can update invites" ON public.org_invites
  FOR UPDATE USING (
    public.is_org_admin_or_owner(org_id, auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON public.org_invites;
CREATE POLICY "Admins can delete invites" ON public.org_invites
  FOR DELETE USING (public.is_org_admin_or_owner(org_id, auth.uid()));

-- ORG_JOIN_REQUESTS
ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and requester can view join requests" ON public.org_join_requests;
CREATE POLICY "Admins and requester can view join requests" ON public.org_join_requests
  FOR SELECT USING (
    public.is_org_admin_or_owner(org_id, auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create join requests" ON public.org_join_requests;
CREATE POLICY "Authenticated users can create join requests" ON public.org_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update join requests" ON public.org_join_requests;
CREATE POLICY "Admins can update join requests" ON public.org_join_requests
  FOR UPDATE USING (public.is_org_admin_or_owner(org_id, auth.uid()));

DROP POLICY IF EXISTS "Requester or admins can delete join requests" ON public.org_join_requests;
CREATE POLICY "Requester or admins can delete join requests" ON public.org_join_requests
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_org_admin_or_owner(org_id, auth.uid())
  );

-- ============================================================
-- UPDATE RLS ON EXISTING TABLES (tasks, notes, categories, timer_stats)
-- Users can see: own data (org_id IS NULL) OR org data if they are a member
-- ============================================================

-- TASKS: drop old policies, create new ones
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own or org tasks" ON public.tasks
  FOR SELECT USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own or org tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own or org tasks" ON public.tasks
  FOR UPDATE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own or org tasks" ON public.tasks
  FOR DELETE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

-- NOTES
DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own or org notes" ON public.notes
  FOR SELECT USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own or org notes" ON public.notes
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own or org notes" ON public.notes
  FOR UPDATE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own or org notes" ON public.notes
  FOR DELETE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own or org categories" ON public.categories
  FOR SELECT USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own or org categories" ON public.categories
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own or org categories" ON public.categories
  FOR UPDATE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own or org categories" ON public.categories
  FOR DELETE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

-- TIMER_STATS
DROP POLICY IF EXISTS "Users can view own timer_stats" ON public.timer_stats;
CREATE POLICY "Users can view own or org timer_stats" ON public.timer_stats
  FOR SELECT USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert own timer_stats" ON public.timer_stats;
CREATE POLICY "Users can insert own or org timer_stats" ON public.timer_stats
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update own timer_stats" ON public.timer_stats;
CREATE POLICY "Users can update own or org timer_stats" ON public.timer_stats
  FOR UPDATE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete own timer_stats" ON public.timer_stats;
CREATE POLICY "Users can delete own or org timer_stats" ON public.timer_stats
  FOR DELETE USING (
    (auth.uid() = user_id AND organization_id IS NULL)
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id, auth.uid()))
  );

-- ============================================================
-- DONE — Organizations schema complete
-- ============================================================
