"use client";

import { Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { EmployeeOSContainer, EmployeePortalTab } from "@/components/employee/portal/employee-os-container";
import { Loader2 } from "lucide-react";

function EmployeeWorkContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as EmployeePortalTab | null;
  const initialTab: EmployeePortalTab = tabParam || "MY_WORK";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  return <EmployeeOSContainer onLogout={handleLogout} initialTab={initialTab} />;
}

export default function EmployeeWorkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bos-bg)] flex items-center justify-center font-mono text-xs text-[var(--bos-text-tertiary)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)] mr-2" />
          <span>INITIALIZING WORK ENVIRONMENT...</span>
        </div>
      }
    >
      <EmployeeWorkContent />
    </Suspense>
  );
}
