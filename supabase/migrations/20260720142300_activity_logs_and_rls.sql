-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
CREATE POLICY "Authenticated users can read logs" ON public.activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Update notification_logs constraint to ON DELETE CASCADE
-- First we need to drop the existing constraint. Let's find its name.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.notification_logs'::regclass
      AND confrelid = 'public.consultations'::regclass
      AND contype = 'f';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.notification_logs DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE public.notification_logs ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE';
    ELSE 
        -- If it doesn't exist for some reason, just add it.
        ALTER TABLE public.notification_logs 
          ADD CONSTRAINT notification_logs_consultation_id_fkey 
          FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Create Admin User (admin@mediaalkarim.com) in auth.users
-- This ensures the admin user exists with password 'mediaalkarim'
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    admin_email text := 'admin@mediaalkarim.com';
    admin_pass text := 'mediaalkarim';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, recovery_sent_at, last_sign_in_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', admin_email, 
            crypt(admin_pass, gen_salt('bf')), 
            now(), now(), now(), 
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), 
            '', '', '', ''
        );
        
        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
        ) VALUES (
            new_user_id, new_user_id, format('{"sub":"%s","email":"%s"}', new_user_id::text, admin_email)::jsonb, 'email', now(), now(), now(), gen_random_uuid()
        );
    END IF;
END $$;
