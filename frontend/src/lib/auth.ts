import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "./db";
import { loginSchema } from "./validation";

/**
 * Thrown when credentials are valid but the account's email is unverified.
 * The `code` is surfaced to the client (via the `?code=` redirect param)
 * so the login UI can offer a "resend verification email" flow.
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

const providers: ReturnType<typeof Credentials | typeof Google>[] = [
  Credentials({
    credentials: {
      email: { label: "Work Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;
      // Suspended/disabled accounts are rejected with the generic message —
      // never reveal account state to the caller.
      if (user.status !== "ACTIVE") return null;
      const valid = await compare(password, user.passwordHash);
      if (!valid) return null;
      if (!user.emailVerified) {
        throw new EmailNotVerifiedError(
          "Your email is not verified yet. Check your inbox for the verification link.",
        );
      }
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status,
        sessionVersion: user.sessionVersion,
      };
    },
  }),
];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "7df8924b1d62c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user?.email) {
        try {
          const normalizedEmail = user.email.trim().toLowerCase();
          const providerAccountId = String(
            account.providerAccountId ||
            (account as any).id ||
            (profile as any)?.sub ||
            ""
          ).trim();

          // 1. Detach providerAccountId from any other user to prevent unique constraint (P2002) violations
          if (providerAccountId) {
            await db.user.updateMany({
              where: {
                googleId: providerAccountId,
                NOT: { email: normalizedEmail },
              },
              data: { googleId: null },
            });
          }

          const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

          if (existing) {
            // Suspended/disabled accounts cannot sign in through any provider.
            if (existing.status !== "ACTIVE") return false;
            // Link the Google identity to the existing account without overwriting existing company name or data.
            await db.user.update({
              where: { id: existing.id },
              data: {
                ...(providerAccountId ? { googleId: providerAccountId } : {}),
                emailVerified: existing.emailVerified ?? new Date(),
                lastLoginAt: new Date(),
              },
            });
          } else {
            // First-time Google sign up: create user with empty companyName so onboarding prompts for company name.
            await db.user.create({
              data: {
                name: user.name?.trim() || "Workspace owner",
                companyName: "",
                email: normalizedEmail,
                passwordHash: "",
                emailVerified: new Date(),
                provider: "GOOGLE",
                ...(providerAccountId ? { googleId: providerAccountId } : {}),
                lastLoginAt: new Date(),
              },
            });
          }
        } catch (error) {
          console.error("[auth] Google signIn callback error:", error);
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      try {
        const userEmail = (user?.email || token.email || "") as string;
        const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;
        let dbUser = normalizedEmail
          ? await db.user.findUnique({ where: { email: normalizedEmail } })
          : (token.id ? await db.user.findUnique({ where: { id: token.id as string } }) : null);

        if (!dbUser && normalizedEmail && account?.provider === "google") {
          try {
            dbUser = await db.user.create({
              data: {
                name: user?.name?.trim() || "Workspace owner",
                companyName: "",
                email: normalizedEmail,
                passwordHash: "",
                emailVerified: new Date(),
                provider: "GOOGLE",
                lastLoginAt: new Date(),
              },
            });
          } catch (createErr) {
            console.error("[auth] jwt fallback user creation error:", createErr);
          }
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.emailVerified = dbUser.emailVerified instanceof Date;
          token.companyName = dbUser.companyName;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.sessionVersion = dbUser.sessionVersion;
        } else if (user) {
          token.id = user.id as string;
          token.emailVerified = user.emailVerified instanceof Date;
          token.companyName = (user as any).companyName ?? null;
          token.role = (user as any).role ?? "OWNER";
          token.status = (user as any).status ?? "ACTIVE";
          token.sessionVersion = (user as any).sessionVersion ?? 1;
        }
        if (account?.provider) {
          token.provider = account.provider === "google" ? "GOOGLE" : "EMAIL";
        }
      } catch (err) {
        console.error("[auth] jwt callback error:", err);
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token.id) {
          // Enforce account state on every session read (server pages, proxy,
          // and API routes). This is what makes password resets and account
          // suspensions actually revoke existing JWT sessions.
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
          });
          const stillValid =
            dbUser &&
            dbUser.status === "ACTIVE" &&
            dbUser.sessionVersion === (token.sessionVersion ?? 1);

          if (!stillValid) {
            // Session revoked (password reset) or account no longer active —
            // present the session as signed out. The JSON response omits `user`,
            // so the client/proxy treat the request as unauthenticated.
            session.user = undefined as unknown as typeof session.user;
            return session;
          }

          session.user.id = dbUser.id;
          // The augmented Session type intersects emailVerified with the
          // AdapterUser field; assign via a boolean-typed view.
          (session.user as { emailVerified: boolean }).emailVerified =
            dbUser.emailVerified instanceof Date;
          session.user.companyName = dbUser.companyName;
          session.user.role = dbUser.role;
          session.user.status = dbUser.status;
        }
      } catch (err) {
        console.error("[auth] session callback error:", err);
      }
      return session;
    },
  },
});
