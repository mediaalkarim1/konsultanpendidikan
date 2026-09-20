GRANT SELECT, INSERT ON public.consultations TO anon;
GRANT SELECT, INSERT ON public.consultation_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_answers TO authenticated;
GRANT ALL ON public.consultations TO service_role;
GRANT ALL ON public.consultation_answers TO service_role;
GRANT ALL ON public.consultation_analysis TO service_role;
GRANT SELECT ON public.consultation_analysis TO authenticated;
NOTIFY pgrst, 'reload schema';