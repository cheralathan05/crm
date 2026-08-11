import { BusinessOSMark } from "./business-os-mark";

export function SystemFooter() {
  return (
    <footer className="flex items-center justify-between py-4 text-[10px] text-[var(--bos-text-tertiary)] tracking-[0.06em] border-t border-[var(--bos-line)] mt-auto">
      <div className="flex items-center gap-2">
        <BusinessOSMark size="sm" />
        <span className="opacity-60">BUSINESS OPERATING SYSTEM</span>
      </div>
      <div className="flex items-center gap-4">
        <span>v1.0</span>
        <span className="w-px h-3 bg-[var(--bos-line)]" />
        <span>ENCRYPTED ACCESS</span>
        <span className="w-px h-3 bg-[var(--bos-line)]" />
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