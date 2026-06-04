import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Username / Employee Code', type: 'text' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password || !credentials?.role) return null

        if (credentials.role === 'admin') {
          const admin = await prisma.admin.findUnique({ where: { username: credentials.identifier } })
          if (!admin) return null
          const valid = await bcrypt.compare(credentials.password, admin.password)
          if (!valid) return null
          return { id: admin.id, name: admin.username, email: null, role: 'admin' as const }
        } else {
          const employee = await prisma.employee.findUnique({ where: { email: credentials.identifier.toLowerCase() } })
          if (!employee || !employee.isActive) return null
          const valid = await bcrypt.compare(credentials.password, employee.password)
          if (!valid) return null
          return { id: employee.id, name: employee.name, email: employee.email, role: 'employee' as const }
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: 'admin' | 'employee' }).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      return session
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET
}
