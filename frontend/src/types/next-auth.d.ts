import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    companyName?: string | null;
    emailVerified?: Date | null;
    role?: "OWNER" | "ADMIN" | "MEMBER";
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
    sessionVersion?: number;
  }

  interface Session {
    user: {
      id: string;
      emailVerified: boolean;
      companyName?: string | null;
      role: "OWNER" | "ADMIN" | "MEMBER";
      status: "ACTIVE" | "SUSPENDED" | "DISABLED";
    } & Omit<NonNullable<DefaultSession["user"]>, "emailVerified">;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    emailVerified?: boolean;
    companyName?: string | null;
    role?: "OWNER" | "ADMIN" | "MEMBER";
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
    sessionVersion?: number;
    provider?: "EMAIL" | "GOOGLE";
  }
}
