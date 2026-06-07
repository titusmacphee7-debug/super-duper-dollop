import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/core/db";
import { UnauthorizedError } from "@/lib/core/errors";

/**
 * Single-user now, multi-user-ready. A Credentials provider checks one env-defined
 * account; sessions are JWTs (no DB adapter needed yet). When multi-user lands,
 * swap in an adapter + real providers without changing call sites.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Workshop Buddy",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        if (email !== process.env.AUTH_USER_EMAIL?.toLowerCase()) return null;
        if (password !== process.env.AUTH_USER_PASSWORD) return null;
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: "Maker" },
        });
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) session.user.email = token.email as string;
      return session;
    },
  },
};

/**
 * Resolve the acting user for API routes. Falls back to DEV_USER_EMAIL when no
 * session is present so the backend is usable single-user before auth UI exists.
 * Returns null only when neither a session nor a dev fallback is configured.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  // Dev convenience only: never honor the unauthenticated fallback in production, or a stray
  // DEV_USER_EMAIL would let every anonymous request act as that user (auth bypass).
  const devFallback =
    process.env.NODE_ENV === "production" ? undefined : process.env.DEV_USER_EMAIL;
  const email = session?.user?.email ?? devFallback;
  if (!email) return null;
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), name: "Maker" },
  });
}

/** Like getCurrentUser, but throws 401 when no user can be resolved. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
