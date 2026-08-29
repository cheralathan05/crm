"use client";

import { signOut } from "next-auth/react";
import { EmployeeProductWorkspaceShell } from "@/components/employee/product-workspace/product-workspace-shell";

export default function EmployeeProjectPage() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  return <EmployeeProductWorkspaceShell onLogout={handleLogout} />;
}
