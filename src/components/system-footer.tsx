import { BusinessOSMark } from "./business-os-mark";

export function SystemFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 py-3 text-[10px] text-[var(--bos-text-tertiary)] tracking-[0.06em] mt-auto w-full">
      <div className="flex items-center gap-2 shrink-0">
        <BusinessOSMark size="sm" />
        <span className="opacity-60">BUSINESS OPERATING SYSTEM</span>
      </div>
      <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap text-[9.5px] sm:text-[10px]">
        <span>v1.0</span>
        <span className="w-px h-3 bg-[var(--bos-line)]" />
        <span className="hidden xs:inline sm:inline">ENCRYPTED ACCESS</span>
        <span className="w-px h-3 bg-[var(--bos-line)] hidden xs:inline sm:inline" />
        <span>SYSTEM READY</span>
      </div>
    </footer>
  );
}

export function SystemFooterSimple() {
  return (
    <footer className="text-center text-[10px] text-[var(--bos-text-tertiary)] tracking-[0.06em] pb-6">
      <span>BUSINESS OPERATING SYSTEM v1.0</span>
    </footer>
  );
}