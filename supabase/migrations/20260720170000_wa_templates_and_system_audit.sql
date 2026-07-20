-- Migration: Create wa_templates table for editable WhatsApp message templates

CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default WhatsApp Templates
INSERT INTO public.wa_templates (template_key, template_name, content)
VALUES
  (
    'admin_notification',
    'Pesan Notifikasi Admin',
    'Ada konsultasi baru yang masuk.

Nama: {{nama}}
Nomor HP: {{nomor}}
Jenjang: {{jenjang}}
Tanggal: {{tanggal}}

Silakan login ke Dashboard Admin untuk melihat detail konsultasi.'
  ),
  (
    'participant_notification',
    'Pesan Notifikasi Peserta',
    'Terima kasih telah mengirim konsultasi di EduKonsul.

Data Anda telah kami terima.

Saat ini sistem sedang melakukan analisis.

Tim kami akan menghubungi Anda apabila diperlukan.

Terima kasih.'
  )
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  content = EXCLUDED.content;

-- Disable RLS and Grant Permissions for seamless admin CRUD
ALTER TABLE public.wa_templates DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.wa_templates TO anon, authenticated, service_role, public;
