import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// ── Constants ──────────────────────────────────────────────────────────────────
const COOKIE_ADMIN = 'admin_session'
const COOKIE_USER  = 'user_session'
const EXPIRES_SEC  = 60 * 60 * 8 // 8 hours

export type AdminPayload = {
  role: 'admin'
  email: string
}

export type UserPayload = {
  role: 'user'
  accountId: string
  email: string
}

export type SessionPayload = AdminPayload | UserPayload

// ── JWT helpers ───────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_SEC}s`)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ── Cookie helpers (server-side, inside Route Handlers & Server Components) ───

export async function setAdminSession(email: string): Promise<void> {
  const token = await signToken({ role: 'admin', email })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_ADMIN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EXPIRES_SEC,
    path: '/',
  })
}

export async function setUserSession(accountId: string, email: string): Promise<void> {
  const token = await signToken({ role: 'user', accountId, email })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_USER, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EXPIRES_SEC,
    path: '/',
  })
}

export async function clearSession(which: 'admin' | 'user' | 'both'): Promise<void> {
  const cookieStore = await cookies()
  if (which === 'admin' || which === 'both') {
    cookieStore.set(COOKIE_ADMIN, '', { maxAge: 0, path: '/' })
  }
  if (which === 'user' || which === 'both') {
    cookieStore.set(COOKIE_USER, '', { maxAge: 0, path: '/' })
  }
}

// ── Session readers ────────────────────────────────────────────────────────────

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_ADMIN)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return null
  return payload
}

export async function getUserSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_USER)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'user') return null
  return payload
}

// ── Middleware helpers (reads from NextRequest — no cookies() API) ─────────────

export async function getAdminSessionFromRequest(req: NextRequest): Promise<AdminPayload | null> {
  const token = req.cookies.get(COOKIE_ADMIN)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return null
  return payload
}

export async function getUserSessionFromRequest(req: NextRequest): Promise<UserPayload | null> {
  const token = req.cookies.get(COOKIE_USER)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'user') return null
  return payload
}
