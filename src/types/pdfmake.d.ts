declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf(docDefinition: unknown): { getBuffer(): Promise<Buffer> };
    addVirtualFileSystem?(vfs: Record<string, string>): void;
    vfs?: Record<string, string>;
    virtualfs?: { storage: Record<string, unknown> };
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: Record<string, string>;
  export = fonts;
}
