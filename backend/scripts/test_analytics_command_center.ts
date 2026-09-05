import { db } from "../src/lib/db";
import { getCommandCenterOverview } from "../src/lib/analytics/analytics-pulse.service";
import { getAttentionCenterItems } from "../src/lib/analytics/attention-center.service";
import { getEarlyDeliveryIntelligence } from "../src/lib/analytics/early-delivery.service";
import { getScopeDriftAnalysis } from "../src/lib/analytics/scope-drift.service";
import { getCommercialAndCashflow } from "../src/lib/analytics/commercial-cashflow.service";
import { askBusinessOS } from "../src/lib/analytics/ask-business-os.service";
import { generateExecutiveBusinessReport } from "../src/lib/analytics/report-engine.service";

async function runTest() {
  console.log("=== TESTING BUSINESS OS COMMAND CENTER INTELLIGENCE ===");

  const workspace = await db.workspace.findFirst();
  if (!workspace) {
    console.error("No workspace found!");
    return;
  }
  console.log("Found Workspace:", workspace.id, workspace.companyName);

  // 1. Test Overview / Pulse
  console.log("\n1. Testing Business Pulse & Overview...");
  const overview = await getCommandCenterOverview(workspace.id, workspace.ownerId);
  console.log("Pulse categories:", overview.pulse.map((p) => `${p.category}: ${p.status}`));
  console.log("Do This Next:", overview.doThisNext ? overview.doThisNext.title : "None (All clear)");
  console.log("Execution:", overview.execution);
  console.log("Financial:", overview.financial);
  console.log("Positive Signals:", overview.positiveSignals.length);

  // 2. Test Attention Center & Priority Engine
  console.log("\n2. Testing Attention Center & Priority Engine...");
  const attention = await getAttentionCenterItems(workspace.id);
  console.log("Total attention items:", attention.totalCount, "Critical:", attention.criticalCount);
  if (attention.items.length > 0) {
    console.log("Top Priority Item:", {
      title: attention.items[0].title,
      score: attention.items[0].priorityScore,
      reason: attention.items[0].priorityReason,
      action: attention.items[0].actionLabel,
    });
  }

  // 3. Test Early Delivery & Unlock Value
  console.log("\n3. Testing Early Delivery & Unlock Value...");
  const early = await getEarlyDeliveryIntelligence(workspace.id);
  console.log("Delivery Breakdown:", early.breakdown);
  console.log("Early Verified Count:", early.earlyVerifiedItems.length);
  console.log("Queues:", early.queues.map((q) => `${q.queueName}: ${q.itemCount}`));

  // 4. Test Scope Drift & Traceability
  console.log("\n4. Testing Scope Drift & Traceability...");
  const drift = await getScopeDriftAnalysis(workspace.id);
  console.log("Traceability Rate:", `${drift.traceabilityRate}%`);
  console.log("Drift / Untraced Items:", drift.untraceableTasksCount);

  // 5. Test Commercial & Cashflow
  console.log("\n5. Testing Commercial & Cashflow...");
  const comm = await getCommercialAndCashflow(workspace.id);
  console.log("Commercial:", comm.commercial);
  console.log("Cashflow Events:", comm.cashflowTimeline.length);

  // 6. Test Ask Business OS
  console.log("\n6. Testing Ask Business OS...");
  const answer1 = await askBusinessOS("Show me all blocked work", workspace.id);
  console.log("Q: 'Show me all blocked work'");
  console.log("Answer:", answer1.answer);
  console.log("Confidence:", answer1.confidence);

  const answer2 = await askBusinessOS("Which payments are waiting?", workspace.id);
  console.log("Q: 'Which payments are waiting?'");
  console.log("Answer:", answer2.answer);
  console.log("Confidence:", answer2.confidence);

  // 7. Test Executive Business Report & PDF Generation
  console.log("\n7. Testing One-Click Executive Report Generation & Snapshot Freezing...");
  const report = await generateExecutiveBusinessReport({
    workspaceId: workspace.id,
    title: "Executive Business Report — Verification Run",
    createdByName: "Automated Verifier",
  });
  console.log("Report generated successfully!");
  console.log("Snapshot ID:", report.snapshotId);
  console.log("Version:", report.version);
  console.log("PDF Path:", report.pdfPath);
  console.log("Executive Summary:", report.executiveSummary);

  console.log("\n=== ALL INTELLIGENCE PIPELINES VERIFIED SUCCESSFULLY ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
