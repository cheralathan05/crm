import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { buildPremiumProposalDocument } from "@/lib/proposal-engine";
import { proposalToPdfDefinition } from "@/lib/proposal";
import { PDFDocument } from "pdf-lib";

if (typeof (pdfMake as any).addVirtualFileSystem === "function") {
  (pdfMake as any).addVirtualFileSystem(pdfFonts);
}
(pdfMake as any).vfs = pdfFonts;

const doc = buildPremiumProposalDocument({
  proposal: { id: "test", title: "Test Proposal", amount: 500000, version: 1, currency: "INR", reference: "PROP-001", createdAt: new Date() } as any,
  client: { id: "c1", companyName: "Acme Corp", industry: "FinTech", email: "client@acme.com", workspaceId: "w1" } as any,
  workspace: { id: "w1", companyName: "Studio Pro", profile: null } as any,
  contact: { name: "John Doe", role: "CTO", email: "john@acme.com" } as any,
  answers: {
    business: { description: "Acme builds financial products", problem: "Manual banking reconciliations" },
    vision: { description: "Automated platform", goals: ["Scale to 10k users"] },
    scope: { included: ["Web app", "Admin portal"] },
    commercial: { budgetRange: "5L - 10L" }
  },
  features: [{ name: "Payment Reconciliation", priority: "MUST_HAVE", description: "Reconciles payments", users: ["Finance Team"] }]
});

console.log("Sections with dynamic numbering:", doc.sections.map(s => `${s.number} - ${s.id} (${s.title})`));
const def = proposalToPdfDefinition(doc);
(pdfMake as any).createPdf(def).getBuffer().then(async (raw: any) => {
  const buf = Buffer.from(new Uint8Array(raw));
  const parsed = await PDFDocument.load(buf);
  console.log("PDF generated! Pages:", parsed.getPageCount(), "Bytes:", buf.length);
}).catch(console.error);
