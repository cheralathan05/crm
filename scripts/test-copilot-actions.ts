/** Unit tests for copilot action parsing / stripping / mapping. */
import {
  actionLabel,
  actionRequest,
  parseActions,
  stripActions,
} from "../src/lib/copilot-actions";

let failures = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

const SAMPLE =
  "NEXT — Follow up with the client.\n" +
  "[ACTION]{\"type\":\"create_task\",\"title\":\"Follow up with Priya\"}[/ACTION]";

// 1. Parse a valid task action
const actions = parseActions(SAMPLE);
check("parses create_task", actions.length === 1 && actions[0].type === "create_task", JSON.stringify(actions));
check("task title captured", actions[0]?.title === "Follow up with Priya", actions[0]?.title ?? "none");

// 2. stripActions removes the block but keeps prose
const stripped = stripActions(SAMPLE);
check("strips block from text", !stripped.includes("[ACTION]") && !stripped.includes("create_task"), stripped);
check("keeps prose", stripped.includes("NEXT — Follow up"), stripped.slice(0, 40));

// 3. Malformed block is ignored but text survives
const malformed = "Some text [ACTION]{not json[/ACTION] end";
check("malformed block not parsed", parseActions(malformed).length === 0);
check("malformed text kept", stripActions(malformed).includes("Some text"), stripActions(malformed));

// 4. Incomplete trailing block stripped mid-stream
const partial = "Answer text [ACTION]{\"type\":\"create_task\",\"title\":\"Half";
const strippedPartial = stripActions(partial);
check("partial block stripped", !strippedPartial.includes("[ACTION]") && strippedPartial === "Answer text", strippedPartial);

// 5. Unknown action type rejected
const unknown = '[ACTION]{"type":"delete_workspace","title":"x"}[/ACTION]';
check("unknown type rejected", parseActions(unknown).length === 0);

// 6. Required-field validation
const noTitle = '[ACTION]{"type":"create_task"}[/ACTION]';
check("missing required field rejected", parseActions(noTitle).length === 0);

// 7. Amount parsing for proposals
const proposal = '[ACTION]{"type":"create_proposal","title":"Website build","amount":250000}[/ACTION]';
const p = parseActions(proposal);
check("proposal parsed", p.length === 1 && p[0].type === "create_proposal", JSON.stringify(p[0]));
check("proposal amount", p[0]?.amount === 250000);

// 8. actionRequest maps to the right endpoint
const req = actionRequest(actions[0], "client-1");
check("create_task maps to tasks endpoint", req.url === "/api/clients/client-1/tasks", req.url);
check("create_task body has title", (req.body as { title: string })?.title === "Follow up with Priya");

const note = actionRequest({ type: "create_note", content: "hello" }, "client-1");
check("create_note maps to notes endpoint", note.url === "/api/clients/client-1/notes", note.url);

// 9. Labels
check("label for open_requirement", actionLabel({ type: "open_requirement" }) === "Open requirement");

console.log(failures === 0 ? "\nALL ACTION TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
