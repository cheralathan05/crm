"use client";

import { Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { EmployeeOSContainer, EmployeePortalTab } from "@/components/employee/portal/employee-os-container";
import { Loader2 } from "lucide-react";

function EmployeeRootContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as EmployeePortalTab | null;
  const initialTab: EmployeePortalTab = tabParam || "HOME";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  return <EmployeeOSContainer onLogout={handleLogout} initialTab={initialTab} />;
}

export default function EmployeeRootPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center font-mono text-xs text-[var(--bos-text-tertiary)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)] mr-2" />
          <span>INITIALIZING EMPLOYEE WORKSPACE...</span>
        </div>
      }
    >
      <EmployeeRootContent />
    </Suspense>
  );
}
