/* Quick sanity checks for the voice engine's pure helpers. */
import { splitSentences } from "../src/lib/voice";

let failures = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

// Sentence splitting keeps terminators and trims.
eq("basic sentences", splitSentences("Hello. How are you? Fine."), ["Hello.", "How are you?", "Fine."]);
eq("ellipsis", splitSentences("Wait… what happened?"), ["Wait…", "what happened?"]);
eq("single sentence", splitSentences("Just one thought"), ["Just one thought"]);
eq("exclamation", splitSentences("Great! Let's go!"), ["Great!", "Let's go!"]);
eq("empty", splitSentences(""), []);
eq("whitespace", splitSentences("   "), []);

console.log(failures === 0 ? "\nALL VOICE HELPER TESTS PASS" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
