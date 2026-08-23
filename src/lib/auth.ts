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

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "7df8924b1d62c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email } });
        if (existing) {
          // Suspended/disabled accounts cannot sign in through any provider.
          if (existing.status !== "ACTIVE") return false;
          // Link the Google identity to the existing account on first use.
          if (!existing.googleId) {
            await db.user.update({
              where: { id: existing.id },
              data: { googleId: account.providerAccountId },
            });
          }
        } else {
          await db.user.create({
            data: {
              name: user.name ?? "Workspace owner",
              companyName: "Untitled workspace",
              email: user.email,
              passwordHash: "",
              emailVerified: new Date(),
              provider: "GOOGLE",
              googleId: account.providerAccountId,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Always normalize the session identity to the DATABASE user id.
        // For OAuth sign-ins the `user.id` from the provider is the Google
        // subject — NOT the DB record — which would silently break any
        // user-scoped query built on session.user.id.
        const dbUser = user.email
          ? await db.user.findUnique({ where: { email: user.email } })
          : null;

        if (dbUser) {
          token.id = dbUser.id;
          token.emailVerified = dbUser.emailVerified instanceof Date;
          token.companyName = dbUser.companyName;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.sessionVersion = dbUser.sessionVersion;
        } else {
          token.id = user.id as string;
          token.emailVerified = user.emailVerified instanceof Date;
          token.companyName = user.companyName ?? null;
          token.role = user.role ?? "OWNER";
          token.status = user.status ?? "ACTIVE";
          token.sessionVersion = user.sessionVersion ?? 1;
        }
        token.provider = account?.provider === "google" ? "GOOGLE" : "EMAIL";
      }
      return token;
    },
    async session({ session, token }) {
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
      return session;
    },
  },
});
