# Attendance System

Employee attendance management with GPS location verification. Built with Next.js 14, Prisma, PostgreSQL, and NextAuth.

## Features

- **Admin panel**: Add employees, view all reports, configure settings
- **Employee portal**: Check in / check out via GPS location
- **Location verification**: Server-side Haversine distance validation (default: 300m radius)
- **First-time activation**: Each employee registers their GPS location once (admin can reset)
- **Salary reports**: Monthly breakdown — present days, absences, late minutes, deductions, net salary
- **Security**: All location math is server-side. Employees cannot bypass via DevTools or console.

## Default admin credentials

```
Username: admin
Password: Admin@123!
```
**Change this immediately after first login via Settings.**

---

## Local Development

### 1. Create a PostgreSQL database

Use [Neon](https://neon.tech) (free) or [Supabase](https://supabase.com) (free).

### 2. Create `.env.local`

```env
DATABASE_URL="postgresql://user:password@host:5432/attendance_db?sslmode=require"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Push schema & seed

```bash
npm install
npx prisma db push
npx prisma db seed
```

### 4. Run

```bash
npm run dev
```

---

## Deploy to Vercel

### Step 1 — Create a PostgreSQL database
Use [Neon.tech](https://neon.tech) (Vercel's recommended free PostgreSQL):
1. Create project → copy the connection string
2. Make sure to use the **pooled connection** string for Vercel serverless

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Add Environment Variables:
   ```
   DATABASE_URL    = <your neon connection string>
   NEXTAUTH_SECRET = <random 32-byte base64 string>
   NEXTAUTH_URL    = https://your-app.vercel.app
   ```
3. Deploy

### Step 4 — Initialize database
After deploy, run seed via Vercel CLI or locally pointing to the production DB:
```bash
DATABASE_URL="<production url>" npx prisma db push
DATABASE_URL="<production url>" npx prisma db seed
```

---

## Security Notes

- Location is validated **server-side only** — client coordinates are never trusted
- Even if an employee intercepts and modifies the API request, the server recalculates distance against the stored reference coordinates in the database
- All invalid attempts (wrong location) are logged with IP address and user agent
- Rate limiting: max 10 attendance requests per minute per employee
- Employees cannot change their reference location — only admin can reset it
- Passwords are bcrypt-hashed (cost factor 12)
