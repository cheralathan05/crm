declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf(docDefinition: unknown): { getBuffer(cb: (buffer: Buffer) => void): void };
    vfs: Record<string, string>;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: { pdfMake: { vfs: Record<string, string> } };
  export = fonts;
}
