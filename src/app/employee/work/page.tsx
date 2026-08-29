"use client";

import { signOut } from "next-auth/react";
import { EmployeeOSShell } from "@/components/employee/os/employee-os-shell";

export default function EmployeeWorkPage() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  return <EmployeeOSShell onLogout={handleLogout} />;
}
