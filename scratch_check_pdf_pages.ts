import fs from "fs";
import { PDFDocument } from "pdf-lib";

async function main() {
  const buf = fs.readFileSync("test_out.pdf");
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  console.log("Total pages:", doc.getPageCount());

  for (let i = 0; i < doc.getPageCount(); i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    console.log(`Page ${i + 1}: size=${width}x${height}`);
  }
}

main().catch(console.error);
