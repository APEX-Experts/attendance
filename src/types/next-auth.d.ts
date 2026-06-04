import type { DefaultSession, DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: 'admin' | 'employee'
    } & DefaultSession['user']
  }
  interface User extends DefaultUser {
    id: string
    role: 'admin' | 'employee'
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: 'admin' | 'employee'
  }
}
