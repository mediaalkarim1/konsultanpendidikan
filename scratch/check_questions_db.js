import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function checkQuestions() {
  const supabaseAdmin = getAdminSupabase();
  const { data: questions, error } = await supabaseAdmin.from("questions").select("id, question_text, level");
  console.log(`[Questions in DB] Total: ${questions?.length || 0}, Error: ${error?.message || "none"}`);
  (questions || []).forEach(q => {
    console.log(`ID: ${q.id} | Level: ${q.level} | Text: ${q.question_text?.slice(0, 50)}`);
  });
}

checkQuestions();
