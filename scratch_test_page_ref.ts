import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PDFDocument } from "pdf-lib";

if (typeof (pdfMake as any).addVirtualFileSystem === "function") {
  (pdfMake as any).addVirtualFileSystem(pdfFonts);
}
(pdfMake as any).vfs = pdfFonts;

const docDef = {
  content: [
    { text: "TOC", fontSize: 18 },
    {
      columns: [
        { text: "Section 1" },
        { text: [{ text: "Page " }, { pageReference: "sec1" }] }
      ]
    },
    {
      columns: [
        { text: "Section 2" },
        { text: [{ text: "Page " }, { pageReference: "sec2" }] }
      ]
    },
    { text: "Section 1 Content", id: "sec1", pageBreak: "before" },
    { text: "More sec 1..." },
    { text: "Section 2 Content", id: "sec2", pageBreak: "before" }
  ]
};

async function test() {
  try {
    const raw = await (pdfMake as any).createPdf(docDef).getBuffer();
    console.log("pageReference supported! Buffer len:", raw.length);
  } catch (e) {
    console.log("pageReference failed:", e.message);
  }
}
test();
