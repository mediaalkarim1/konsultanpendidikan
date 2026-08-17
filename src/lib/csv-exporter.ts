import { getAdminSupabase } from './supabase-admin';
import { resolveOptionAndAnswerText } from '@/actions/process-consultation';

export interface CsvExportOptions {
  renderChoicesAsHeaders?: boolean;
  delimiter?: string;
}

/**
 * Maps option indexes (0..N) to choice codes (A, B, C, D, E, F...).
 */
export function getOptionCode(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < letters.length) {
    return letters[index];
  }
  return `O${index + 1}`;
}

/**
 * Generates CSV string for a consultation questionnaire answers.
 */
export async function generateConsultationAnswersCsv(
  consultationId: string,
  options: CsvExportOptions = {}
): Promise<string> {
  const { renderChoicesAsHeaders = true, delimiter = ',' } = options;
  const supabase = getAdminSupabase();

  try {
    // 1. Fetch consultation & level info
    const { data: consultation, error: consErr } = await supabase
      .from('consultations')
      .select('id, level, parent_name, child_name')
      .eq('id', consultationId)
      .single();

    if (consErr || !consultation) {
      throw new Error(`Konsultasi dengan ID '${consultationId}' tidak ditemukan.`);
    }

    // 2. Fetch all questions for this consultation level
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select(`
        id,
        order_index,
        question_text,
        question_type,
        options (
          id,
          option_text,
          order_index
        )
      `)
      .eq('level', consultation.level)
      .order('order_index', { ascending: true });

    if (qErr || !questions) {
      throw new Error(`Gagal mengambil daftar pertanyaan untuk jenjang ${consultation.level}: ${qErr?.message}`);
    }

    // 3. Fetch user's consultation answers
    const { data: rawAnswers, error: ansErr } = await supabase
      .from('consultation_answers')
      .select('*')
      .eq('consultation_id', consultationId);

    if (ansErr) {
      throw new Error(`Gagal mengambil jawaban kuesioner: ${ansErr.message}`);
    }

    // Build a map of all available options for label fallback
    const optionsMapFromDb: Record<string, string> = {};
    const mappedChoices: Array<{ code: string; text: string; optionId: string }> = [];

    questions.forEach((q) => {
      const rawOpts = (q as any).options || (q as any).question_options || [];
      const opts = Array.isArray(rawOpts) ? [...rawOpts].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)) : [];
      opts.forEach((o: any, idx: number) => {
        if (o.id && o.option_text) {
          optionsMapFromDb[o.id] = o.option_text;
        }
        const code = getOptionCode(idx);
        mappedChoices.push({
          code,
          text: o.option_text || '',
          optionId: o.id,
        });
      });
    });

    // Option Header with key choices format
    const choiceHeader = renderChoicesAsHeaders
      ? ['Pilihan Jawaban (Text)']
      : mappedChoices.map((c) => `Pilihan [${c.code}]`);

    // 4. Transform rows
    const dataRows = questions.map((q) => {
      // Find matching answers for this question
      const userAnswersForQ = (rawAnswers || []).filter((a: any) => a.question_id === q.id);

      // Extract raw input string (e.g. from essay or text input)
      const textInputVal = userAnswersForQ
        .map((a: any) => resolveOptionAndAnswerText(a, optionsMapFromDb))
        .filter(Boolean)
        .join('; ');

      // Determine which choice codes are selected
      let selectedCodes: string[] = [];
      userAnswersForQ.forEach((ans: any) => {
        const optionIds: string[] = ans.selected_option_ids || [];
        optionIds.forEach((optId) => {
          const matchedChoice = mappedChoices.find((c) => c.optionId === optId);
          if (matchedChoice) {
            selectedCodes.push(matchedChoice.code);
          }
        });
      });

      // Prepare choice values depending on export mode
      let choiceValues: string[];
      if (renderChoicesAsHeaders) {
        // Single column showing text of selected options
        const selectedTexts = mappedChoices
          .filter((c) => selectedCodes.includes(c.code))
          .map((c) => `${c.code}: ${c.text}`);
        choiceValues = [selectedTexts.join('; ') || (textInputVal ? textInputVal : '-')];
      } else {
        // Multi-column [A, B, C, D, E...]
        choiceValues = mappedChoices.map((c) => (selectedCodes.includes(c.code) ? c.code : ''));
      }

      return [
        q.order_index,
        q.question_text,
        textInputVal || '-',
        ...choiceValues,
      ];
    });

    // 5. Build final CSV string
    const headers = [
      'No',
      'Pertanyaan Kuesioner',
      'Jawaban Input Isian',
      ...choiceHeader,
    ];

    const csvLines = [
      headers.map(escapeCsvValue).join(delimiter),
      ...dataRows.map((row) => row.map(escapeCsvValue).join(delimiter)),
    ];

    return csvLines.join('\n');
  } catch (err: any) {
    console.error('Error generating CSV export:', err);
    throw new Error(`Gagal membuat berkas CSV: ${err?.message || err}`);
  }
}

/**
 * Escapes special characters for CSV formatting (commas, quotes, newlines).
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
