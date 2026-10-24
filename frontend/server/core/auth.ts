import { createHmac, timingSafeEqual } from 'node:crypto'
import { getHeader, type H3Event } from 'h3'
import { query, type Database } from './db.ts'
import { paymentsEnabled, secretKey } from './config.ts'
import { fail } from './errors.ts'
import type { AuthUser, FavoriteQuestion } from '../../shared/types/auth.ts'

export type User = {
  id: number, name: string, email: string, password_digest: string,
  role: 'user' | 'admin', created_at: Date | string, updated_at?: Date | string,
}
export const TOKEN_LIFETIME = 86400
const iso = (value: Date | string) => new Date(value).toISOString()
const signature = (data: string) => createHmac('sha256', secretKey()).update(data).digest('hex')
const matches = (left: string, right: string) => left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right))

export function issueToken(user: Pick<User, 'id' | 'role'>, now = Date.now()): string {
  const data = Buffer.from(JSON.stringify({ user_id: user.id, role: user.role, exp: Math.floor(now / 1000) + TOKEN_LIFETIME, purpose: 'access_token' })).toString('base64url')
  return `${data}--${signature(data)}`
}

export function verifyToken(token: string, now = Date.now()): { user_id: number, role: string } | null {
  try {
    if (token.length > 8192) return null
    const delimiter = token.lastIndexOf('--')
    if (delimiter < 1) return null
    const data = token.slice(0, delimiter)
    if (!matches(signature(data), token.slice(delimiter + 2))) return null
    const object = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    // Accept existing Rails MessageVerifier JSON envelopes during the cutover.
    const metadata = object._rails
    const payload = metadata?.message ? JSON.parse(Buffer.from(metadata.message, 'base64').toString('utf8')) : metadata?.data || object
    const expires = metadata ? Date.parse(metadata.exp) : Number(payload.exp) * 1000
    const purpose = metadata ? metadata.pur : payload.purpose
    if (purpose !== 'access_token' || !Number.isFinite(expires) || expires <= now) return null
    if (!Number.isSafeInteger(payload.user_id) || payload.user_id < 1 || !['user', 'admin'].includes(payload.role)) return null
    return { user_id: payload.user_id, role: payload.role }
  } catch { return null }
}

export async function authenticate(event: H3Event, required = false, db?: Database): Promise<User | null> {
  const header = getHeader(event, 'authorization')
  if (!header && !required) return null
  const token = header?.match(/^Bearer (.+)$/)?.[1]
  const payload = token ? verifyToken(token) : null
  const user = payload ? (await query<User>('SELECT * FROM users WHERE id=$1', [payload.user_id], db))[0] : null
  if (!user || user.role !== payload?.role) fail(401, 'unauthorized', 'ログインが必要です')
  return user
}

export async function requireAdmin(event: H3Event): Promise<User> {
  const user = (await authenticate(event, true))!
  if (user.role !== 'admin') fail(403, 'forbidden', '管理者権限が必要です')
  return user
}

export async function hasPaidAccess(user: User | null | undefined, db?: Database): Promise<boolean> {
  if (!paymentsEnabled) return true
  if (!user) return false
  if (user.role === 'admin') return true
  const rows = await query(`SELECT EXISTS(SELECT 1 FROM memberships WHERE user_id=$1 AND status='active') OR EXISTS(SELECT 1 FROM verification_access_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP) AS allowed`, [user.id], db)
  return rows[0]?.allowed === true
}

export async function userPayload(user: User, db?: Database): Promise<AuthUser> {
  const [membership] = await query('SELECT * FROM memberships WHERE user_id=$1', [user.id], db)
  const [grant] = await query('SELECT * FROM verification_access_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP', [user.id], db)
  const access = await hasPaidAccess(user, db)
  const favorites = access ? await query<FavoriteQuestion>(`SELECT q.id,q.exam_number,q.question_number FROM favorites f JOIN questions q ON q.id=f.question_id WHERE f.user_id=$1 AND q.publication_status='published' ORDER BY q.exam_number,q.question_number`, [user.id], db) : []
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    paid_content_access: access, favorite_questions: favorites,
    membership: { status: membership?.status || 'free', purchased_at: membership?.activated_at ? iso(membership.activated_at) : null, expires_at: null },
    verification_access: grant ? { expires_at: iso(grant.expires_at) } : null,
    created_at: iso(user.created_at),
  }
}
