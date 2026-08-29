"use client";

import { signOut } from "next-auth/react";
import { EmployeeProjectHome } from "@/components/employee/employee-project-home";

export default function EmployeeProjectPage() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/employee/login" });
  };

  return <EmployeeProjectHome onLogout={handleLogout} />;
}
