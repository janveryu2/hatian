-- ============================================
-- HATIAN — Supabase Schema Migration (Non-Recursive RLS)
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DROP EXISTING OBJECTS (FOR CLEAN RERUNS)
-- ============================================
DROP TABLE IF EXISTS public.reopen_requests CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bill_amendments CASCADE;
DROP TABLE IF EXISTS public.bill_shares CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.recurring_templates CASCADE;
DROP TABLE IF EXISTS public.bill_categories CASCADE;
DROP TABLE IF EXISTS public.dorm_invites CASCADE;
DROP TABLE IF EXISTS public.dorm_members CASCADE;
DROP TABLE IF EXISTS public.dorms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_dorm_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_dorm_admin(UUID, UUID) CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- 2.1 Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Dorms
CREATE TABLE public.dorms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Dorm Members
CREATE TABLE public.dorm_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID NOT NULL REFERENCES public.dorms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  move_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  move_out_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dorm_id, user_id)
);
CREATE INDEX idx_dorm_members_dorm ON public.dorm_members(dorm_id);
CREATE INDEX idx_dorm_members_user ON public.dorm_members(user_id);

-- 2.4 Dorm Invites
CREATE TABLE public.dorm_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID NOT NULL REFERENCES public.dorms(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dorm_invites_code ON public.dorm_invites(code);
CREATE INDEX idx_dorm_invites_dorm ON public.dorm_invites(dorm_id);

-- 2.5 Bill Categories
CREATE TABLE public.bill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID REFERENCES public.dorms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  is_predefined BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_bill_categories_dorm ON public.bill_categories(dorm_id);

-- 2.6 Recurring Templates
CREATE TABLE public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID NOT NULL REFERENCES public.dorms(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.bill_categories(id),
  default_amount_centavos BIGINT NOT NULL CHECK (default_amount_centavos > 0),
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'percentage', 'custom_amount', 'prorated_by_days')),
  draft_days_before_due INT NOT NULL DEFAULT 3,
  billing_day_of_month INT NOT NULL CHECK (billing_day_of_month BETWEEN 1 AND 31),
  due_day_of_month INT NOT NULL CHECK (due_day_of_month BETWEEN 1 AND 31),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recurring_templates_dorm ON public.recurring_templates(dorm_id);

-- 2.7 Bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID NOT NULL REFERENCES public.dorms(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.bill_categories(id),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'settled', 'reopened')),
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'percentage', 'custom_amount', 'prorated_by_days')),
  recurring_template_id UUID REFERENCES public.recurring_templates(id) ON DELETE SET NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (billing_period_end >= billing_period_start)
);
CREATE INDEX idx_bills_dorm ON public.bills(dorm_id);
CREATE INDEX idx_bills_due_date ON public.bills(due_date);
CREATE INDEX idx_bills_status ON public.bills(status);

-- 2.8 Bill Shares
CREATE TABLE public.bill_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.dorm_members(id) ON DELETE CASCADE,
  amount_owed_centavos BIGINT NOT NULL CHECK (amount_owed_centavos >= 0),
  amount_paid_centavos BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid_centavos >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'acknowledged', 'partial', 'paid', 'confirmed')),
  days_present INT,
  is_days_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),
  UNIQUE (bill_id, member_id)
);
CREATE INDEX idx_bill_shares_bill ON public.bill_shares(bill_id);
CREATE INDEX idx_bill_shares_member ON public.bill_shares(member_id);

-- 2.9 Bill Amendments
CREATE TABLE public.bill_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  amended_by UUID NOT NULL REFERENCES public.profiles(id),
  old_amount_centavos BIGINT NOT NULL,
  new_amount_centavos BIGINT NOT NULL,
  old_split_method TEXT NOT NULL,
  new_split_method TEXT NOT NULL,
  changes_diff JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bill_amendments_bill ON public.bill_amendments(bill_id);

-- 2.10 Payments (Settle-up records)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dorm_id UUID NOT NULL REFERENCES public.dorms(id) ON DELETE CASCADE,
  from_member UUID NOT NULL REFERENCES public.dorm_members(id) ON DELETE CASCADE,
  to_member UUID NOT NULL REFERENCES public.dorm_members(id) ON DELETE CASCADE,
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CHECK (from_member != to_member)
);
CREATE INDEX idx_payments_dorm ON public.payments(dorm_id);
CREATE INDEX idx_payments_from ON public.payments(from_member);
CREATE INDEX idx_payments_to ON public.payments(to_member);

-- 2.11 Reopen Requests
CREATE TABLE public.reopen_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX idx_reopen_requests_bill ON public.reopen_requests(bill_id);

-- ============================================
-- 3. HELPER FUNCTIONS & TRIGGERS (SECURITY DEFINER)
-- ============================================

-- Function to get all dorm IDs a user belongs to without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_dorm_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT dorm_id FROM public.dorm_members WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to get all dorm IDs that have active invites (allows preview on join)
CREATE OR REPLACE FUNCTION public.get_invited_dorm_ids()
RETURNS SETOF UUID AS $$
  SELECT dorm_id FROM public.dorm_invites
  WHERE is_used = FALSE AND expires_at > NOW();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if a user is an admin of a dorm
CREATE OR REPLACE FUNCTION public.is_dorm_admin(dorm_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dorm_members
    WHERE dorm_id = dorm_uuid AND user_id = user_uuid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function: update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dorms_updated_at
  BEFORE UPDATE ON public.dorms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dorm_members_updated_at
  BEFORE UPDATE ON public.dorm_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_recurring_templates_updated_at
  BEFORE UPDATE ON public.recurring_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function: auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Roommate'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Non-recursive via Security Definer Helpers
-- ============================================

-- 4.1 Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read profiles of dorm roommates"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR id IN (
      SELECT dm.user_id FROM public.dorm_members dm
      WHERE dm.dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert/update own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4.2 Dorms RLS
ALTER TABLE public.dorms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members or invite holders can read dorms"
  ON public.dorms FOR SELECT
  USING (
    id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    OR created_by = auth.uid()
    OR id IN (SELECT public.get_invited_dorm_ids())
  );

CREATE POLICY "Authenticated users can create dorms"
  ON public.dorms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update dorms"
  ON public.dorms FOR UPDATE
  USING (public.is_dorm_admin(id, auth.uid()));

CREATE POLICY "Admins can delete dorms"
  ON public.dorms FOR DELETE
  USING (public.is_dorm_admin(id, auth.uid()));

-- 4.3 Dorm Members RLS
ALTER TABLE public.dorm_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read dorm members"
  ON public.dorm_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Users can join dorms"
  ON public.dorm_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

CREATE POLICY "Admins can update members"
  ON public.dorm_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

CREATE POLICY "Admins can remove members or self leave"
  ON public.dorm_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

-- 4.4 Dorm Invites RLS
ALTER TABLE public.dorm_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read invites by code"
  ON public.dorm_invites FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can create invites"
  ON public.dorm_invites FOR INSERT
  WITH CHECK (
    dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Users or admins can update invites"
  ON public.dorm_invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

-- 4.5 Bill Categories RLS
ALTER TABLE public.bill_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read bill categories"
  ON public.bill_categories FOR SELECT
  USING (
    dorm_id IS NULL
    OR dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Members can add custom categories"
  ON public.bill_categories FOR INSERT
  WITH CHECK (
    dorm_id IS NOT NULL
    AND public.is_dorm_admin(dorm_id, auth.uid())
  );

-- 4.6 Recurring Templates RLS
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read recurring templates"
  ON public.recurring_templates FOR SELECT
  USING (
    dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Members can create recurring templates"
  ON public.recurring_templates FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Creator or admin can update templates"
  ON public.recurring_templates FOR UPDATE
  USING (
    auth.uid() = created_by
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

-- 4.7 Bills RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read dorm bills"
  ON public.bills FOR SELECT
  USING (
    dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Members can create bills"
  ON public.bills FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Creator or admin can update bills"
  ON public.bills FOR UPDATE
  USING (
    auth.uid() = created_by
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

CREATE POLICY "Admins can delete bills"
  ON public.bills FOR DELETE
  USING (public.is_dorm_admin(dorm_id, auth.uid()));

-- 4.8 Bill Shares RLS
ALTER TABLE public.bill_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read bill shares"
  ON public.bill_shares FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    )
  );

CREATE POLICY "Bill creator or admin can insert shares"
  ON public.bill_shares FOR INSERT
  WITH CHECK (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE created_by = auth.uid()
        OR public.is_dorm_admin(dorm_id, auth.uid())
    )
  );

CREATE POLICY "Dorm members can update bill shares"
  ON public.bill_shares FOR UPDATE
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    )
  );

CREATE POLICY "Admins can delete shares"
  ON public.bill_shares FOR DELETE
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE public.is_dorm_admin(dorm_id, auth.uid())
    )
  );

-- 4.9 Bill Amendments RLS
ALTER TABLE public.bill_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read amendments"
  ON public.bill_amendments FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    )
  );

CREATE POLICY "Creator or admin can insert amendments"
  ON public.bill_amendments FOR INSERT
  WITH CHECK (auth.uid() = amended_by);

-- 4.10 Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read dorm payments"
  ON public.payments FOR SELECT
  USING (
    dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
  );

CREATE POLICY "Senders can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    from_member IN (
      SELECT id FROM public.dorm_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Receivers can confirm payments"
  ON public.payments FOR UPDATE
  USING (
    to_member IN (
      SELECT id FROM public.dorm_members WHERE user_id = auth.uid()
    )
    OR public.is_dorm_admin(dorm_id, auth.uid())
  );

CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  USING (public.is_dorm_admin(dorm_id, auth.uid()));

-- 4.11 Reopen Requests RLS
ALTER TABLE public.reopen_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read reopen requests"
  ON public.reopen_requests FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE dorm_id IN (SELECT public.get_user_dorm_ids(auth.uid()))
    )
  );

CREATE POLICY "Members can create reopen requests"
  ON public.reopen_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admin or creator can review reopen requests"
  ON public.reopen_requests FOR UPDATE
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE created_by = auth.uid()
        OR public.is_dorm_admin(dorm_id, auth.uid())
    )
  );

-- ============================================
-- 5. SEED PREDEFINED CATEGORIES
-- ============================================
INSERT INTO public.bill_categories (id, dorm_id, name, icon, is_predefined, sort_order) VALUES
  (uuid_generate_v4(), NULL, 'Internet', '📡', TRUE, 0),
  (uuid_generate_v4(), NULL, 'Water', '💧', TRUE, 1),
  (uuid_generate_v4(), NULL, 'Electricity', '⚡', TRUE, 2),
  (uuid_generate_v4(), NULL, 'Rent', '🏠', TRUE, 3),
  (uuid_generate_v4(), NULL, 'Other', '📦', TRUE, 4);

-- ============================================
-- 6. ENABLE REALTIME PUBLICATIONS & REPLICA IDENTITY
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.dorms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dorm_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dorm_invites;

ALTER TABLE public.dorms REPLICA IDENTITY FULL;
ALTER TABLE public.dorm_members REPLICA IDENTITY FULL;
ALTER TABLE public.bills REPLICA IDENTITY FULL;
ALTER TABLE public.bill_shares REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.dorm_invites REPLICA IDENTITY FULL;
