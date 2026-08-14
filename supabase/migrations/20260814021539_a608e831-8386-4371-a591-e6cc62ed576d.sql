-- 1. Extra columns
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS child_name text;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS ai_result text;

-- 2. Analysis table
CREATE TABLE IF NOT EXISTS public.consultation_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  summary text,
  analysis text,
  strengths text,
  weaknesses text,
  potential text,
  risk text,
  education_recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_analysis TO authenticated;
GRANT ALL ON public.consultation_analysis TO service_role;
ALTER TABLE public.consultation_analysis ENABLE ROW LEVEL SECURITY;

-- 3. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@mediaalkarim.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Lock down public read access
DROP POLICY IF EXISTS "Anon can read own inserted consultations" ON public.consultations;
DROP POLICY IF EXISTS "Anon can read own inserted answers" ON public.consultation_answers;
REVOKE SELECT, UPDATE, DELETE ON public.consultations FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.consultation_answers FROM anon;

-- 5. Admin-only read/write access
DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
CREATE POLICY "Admins manage consultations" ON public.consultations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage consultation answers" ON public.consultation_answers;
CREATE POLICY "Admins manage consultation answers" ON public.consultation_answers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage consultation analysis" ON public.consultation_analysis;
CREATE POLICY "Admins manage consultation analysis" ON public.consultation_analysis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));