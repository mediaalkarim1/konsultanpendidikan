CREATE POLICY "Authenticated can read all settings" ON public.settings FOR SELECT TO authenticated USING (true);
NOTIFY pgrst, 'reload schema';