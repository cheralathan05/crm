import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PDFDocument } from "pdf-lib";

if (typeof (pdfMake as any).addVirtualFileSystem === "function") {
  (pdfMake as any).addVirtualFileSystem(pdfFonts);
}
(pdfMake as any).vfs = pdfFonts;

const card = {
  table: {
    widths: ["*"],
    body: [[{ stack: [{ text: "MODULE 01: Identity", bold: true, fontSize: 12 }, { text: "Description of module...", fontSize: 9.5 }] }]],
  },
  layout: {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => "#e7e2d8",
    vLineColor: () => "#e7e2d8",
    fillColor: () => "#faf7f2",
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 8,
    paddingBottom: () => 8,
  },
  margin: [0, 3, 0, 10],
};

const docDef = {
  pageSize: "A4",
  pageMargins: [52, 64, 52, 56],
  content: [card],
};

async function test() {
  const raw = await (pdfMake as any).createPdf(docDef).getBuffer();
  const buf = Buffer.from(new Uint8Array(raw));
  const parsed = await PDFDocument.load(buf);
  console.log("Card PDF generated! Pages:", parsed.getPageCount(), "Bytes:", buf.length);
}
test().catch(console.error);
