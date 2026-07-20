-- Migration: Add default AI Workflow Configuration in settings table

INSERT INTO public.settings (key, value, is_public)
VALUES (
  'ai.workflow_config',
  '{
    "enable_wa_admin_notif": true,
    "enable_wa_parent_notif": true,
    "enable_ai_analysis": true,
    "enable_ai_summary": true,
    "enable_ai_recommendation": true,
    "enable_auto_save": true,
    "auto_analysis": true,
    "generate_resume": true,
    "generate_recommendation": true,
    "save_ai_log": true,
    "save_prompt_history": true,
    "auto_retry": true,
    "auto_fallback": true,
    "request_timeout": 30,
    "prompt_mode": "default"
  }'::jsonb,
  false
)
ON CONFLICT (key) DO NOTHING;
