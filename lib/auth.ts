import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "./prisma";
import { logAuthEvent } from "./audit-logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { employee: true },
        });

        if (!user) {
          // Log failed login attempt for non-existent user
          await logAuthEvent({
            action: "FAILED_LOGIN",
            userEmail: credentials.email,
            context: { reason: "User not found" },
          });
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          // Log failed login attempt for disabled account
          await logAuthEvent({
            action: "FAILED_LOGIN",
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            context: { reason: "Account disabled" },
          });
          throw new Error("Account is disabled");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          // Log failed login attempt for invalid password
          await logAuthEvent({
            action: "FAILED_LOGIN",
            userId: user.id,
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName}`,
            context: { reason: "Invalid password" },
          });
          throw new Error("Invalid email or password");
        }

        // Log successful login
        await logAuthEvent({
          action: "LOGIN",
          userId: user.id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          employeeId: user.employee?.id || null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as string;
        session.user.employeeId = token.employeeId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

