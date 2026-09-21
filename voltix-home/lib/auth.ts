import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import crypto from 'crypto';

export function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  // Format in seed: scrypt:salt:{salt}:salt:{key} -> parts: ['scrypt', 'salt', salt, 'salt', key]
  const salt = parts.length > 2 ? parts[2] : '';
  const hash = parts.length > 4 ? parts[4] : '';
  return new Promise((resolve) =>
    crypto.scrypt(pw, salt, 64, (err, key) => resolve(!err && key.toString('hex') === hash))
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user || !(await verifyPassword(creds.password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => (user ? { ...token, role: (user as { role?: string }).role } : token),
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, role: token.role },
    }),
  },
  pages: { signIn: '/login' },
};
