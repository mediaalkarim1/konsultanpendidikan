import { DEFAULT_TKSD_QUESTIONS } from "../src/actions/seed-tksd.ts";
import { DEFAULT_SMP_QUESTIONS } from "../src/actions/seed-smp.ts";
import { DEFAULT_SMA_QUESTIONS } from "../src/actions/seed-sma.ts";

console.log("==================================================");
console.log("OPTION MAPPING AUDIT");
console.log("==================================================");

const allQuestions = [...DEFAULT_TKSD_QUESTIONS, ...DEFAULT_SMP_QUESTIONS, ...DEFAULT_SMA_QUESTIONS];
const optionsMap = {};

allQuestions.forEach(q => {
  (q.options || []).forEach(o => {
    optionsMap[o.id] = o.option_text;
  });
});

console.log(`Total questions across TKSD, SMP, SMA: ${allQuestions.length}`);
console.log(`Total mapped options: ${Object.keys(optionsMap).length}`);

// Sample check
console.log("\nSample Option Mappings:");
console.log("opt-1-1 ->", optionsMap["opt-1-1"]);
console.log("smp-opt-1-1 ->", optionsMap["smp-opt-1-1"]);
console.log("sma-opt-1-1 ->", optionsMap["sma-opt-1-1"]);
