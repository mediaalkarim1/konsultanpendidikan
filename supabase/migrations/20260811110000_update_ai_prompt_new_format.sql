-- Migration: Update AI Prompt to new 4-section structured format
-- This replaces the old narrative-format prompt stored in the settings table
-- with the new structured format that produces dynamic, per-child analysis.

DO $$
DECLARE
  new_prompt_json JSONB;
BEGIN
  -- Build the JSON value preserving emoji characters in the format
  new_prompt_json := jsonb_build_object(
    'id', 'unified-prompt',
    'system_prompt', '# PERAN' || chr(10) ||
      'Anda adalah Konsultan Pendidikan Anak profesional.' || chr(10) ||
      'Gunakan bahasa Indonesia yang hangat, sopan, mudah dipahami, dan tidak menghakimi.' || chr(10) ||
      '---' || chr(10) ||
      '# DATA KONSULTASI' || chr(10) ||
      'Nama Orang Tua: {{nama_orang_tua}}' || chr(10) ||
      'Nama Anak: {{nama_anak}}' || chr(10) ||
      'Jenjang Pendidikan: {{jenjang}}' || chr(10) ||
      '---' || chr(10) ||
      '# TUGAS' || chr(10) ||
      'Baca SELURUH jawaban orang tua dengan seksama. Temukan pola yang BENAR-BENAR muncul dari jawaban tersebut. Jangan gunakan template kategori yang sama untuk setiap anak.' || chr(10) ||
      '---' || chr(10) ||
      'Hasil analisis hanya terdiri dari 4 bagian:' || chr(10) ||
      '## 1. RINGKASAN AWAL - 1-2 paragraf pendek berdasarkan jawaban aktual.' || chr(10) ||
      '## 2. AREA YANG PERLU DIPERHATIKAN - Setiap area diawali ### dan emoji, berdasarkan pola dari jawaban. Jumlah tidak ditentukan.' || chr(10) ||
      '## 3. MINAT & POTENSI - Setiap potensi menggunakan ### dan emoji, hanya yang ada dari jawaban.' || chr(10) ||
      '## 4. REKOMENDASI - Rekomendasi konkret untuk orang tua di rumah, tanpa rekomendasi sekolah.' || chr(10) ||
      '---' || chr(10) ||
      'ATURAN: Jangan narasi panjang. Jangan template sama untuk semua anak. Jangan diagnosis medis. Jangan rekomendasi sekolah.' || chr(10) ||
      'Data Jawaban Konsultasi: {{jawaban_lengkap}}',
    'updated_at', now()::text
  );

  -- Update or insert the unified prompt in settings table
  IF EXISTS (SELECT 1 FROM settings WHERE key = 'ai.unified_prompt') THEN
    UPDATE settings
    SET value = new_prompt_json,
        updated_at = now()
    WHERE key = 'ai.unified_prompt';
  ELSE
    INSERT INTO settings (key, value, is_public)
    VALUES ('ai.unified_prompt', new_prompt_json, false);
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- If update fails, log and continue
  RAISE NOTICE 'ai.unified_prompt update notice: %', SQLERRM;
END $$;
