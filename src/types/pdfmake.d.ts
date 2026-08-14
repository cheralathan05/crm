declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf(docDefinition: unknown): { getBuffer(): Promise<Buffer> };
    vfs: Record<string, string>;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: Record<string, string>;
  export = fonts;
}
