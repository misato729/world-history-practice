import bcrypt from 'bcryptjs'
import { query, transaction, type Database } from '../core/db.ts'
import { OperationError } from './content.ts'

const normalizedEmail = (value: string | undefined) => (value || '').trim().toLowerCase()
const emailValid = (value: string) => value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
export async function createAdmin(input: { email?: string, password?: string, name?: string }, db?: Database) {
  const email = normalizedEmail(input.email)
  const password = input.password || ''
  const name = input.name?.trim() || '管理者'
  if (!emailValid(email) || Array.from(password).length < 8 || Buffer.byteLength(password) > 72 || Array.from(name).length > 100) throw new OperationError('有効なADMIN_EMAIL、8文字以上72バイト以内のADMIN_PASSWORD、100文字以内のADMIN_NAMEを指定してください')
  const passwordDigest = await bcrypt.hash(password, 12)
  return transaction(async connection => {
    await query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', ['admin:create', email], connection)
    if ((await query('SELECT 1 FROM users WHERE lower(email)=$1', [email], connection)).length) throw new OperationError('このメールアドレスは登録済みです。既存の権限・パスワードは変更しません')
    try {
      await query("INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES($1,$2,$3,'admin',NOW(),NOW())", [name, email, passwordDigest], connection)
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new OperationError('このメールアドレスは登録済みです。既存の権限・パスワードは変更しません')
      throw error
    }
    return { status: 'created' as const }
  }, db)
}

async function userByEmail(email: string | undefined, db: Database) {
  const normalized = normalizedEmail(email)
  if (!emailValid(normalized)) throw new OperationError('USER_EMAILを指定してください')
  const [user] = await query<{ id: number, role: string }>('SELECT id,role FROM users WHERE lower(email)=$1 FOR UPDATE', [normalized], db)
  if (!user) throw new OperationError('対象ユーザーが見つかりません')
  return user
}
export async function grantVerification(input: { email?: string, expiresAt?: string, reason?: string, grantedBy?: string }, db?: Database) {
  const reason = input.reason?.trim() || ''
  const grantedBy = input.grantedBy?.trim() || ''
  const rawExpiry = input.expiresAt || ''
  const expiresAt = new Date(rawExpiry)
  if (!reason || Array.from(reason).length > 255 || !grantedBy || Array.from(grantedBy).length > 100 || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(rawExpiry) || !Number.isFinite(expiresAt.getTime())) throw new OperationError('REASON、GRANTED_BY、タイムゾーン付きISO形式のEXPIRES_ATを指定してください')
  return transaction(async connection => {
    const user = await userByEmail(input.email, connection)
    if (user.role === 'admin') throw new OperationError('管理者には検証用利用資格を追加しません')
    const [clock] = await query<{ now: Date }>('SELECT CURRENT_TIMESTAMP AS now', [], connection)
    const now = new Date(clock!.now)
    if (expiresAt <= now || expiresAt.getTime() > now.getTime() + 7 * 86400000) throw new OperationError('検証用利用資格の期限は付与時刻から7日以内にしてください')
    if ((await query('SELECT 1 FROM verification_access_grants WHERE user_id=$1', [user.id], connection)).length) throw new OperationError('このユーザーの検証用利用資格は登録済みです')
    await query('INSERT INTO verification_access_grants(user_id,reason,granted_by,expires_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$5)', [user.id, reason, grantedBy, expiresAt, now], connection)
    return { status: 'granted' as const, expires_at: expiresAt.toISOString() }
  }, db)
}
export async function revokeVerification(email?: string, db?: Database) {
  return transaction(async connection => {
    const user = await userByEmail(email, connection)
    const rows = await query('UPDATE verification_access_grants SET revoked_at=COALESCE(revoked_at,NOW()),updated_at=CASE WHEN revoked_at IS NULL THEN NOW() ELSE updated_at END WHERE user_id=$1 RETURNING id', [user.id], connection)
    if (!rows.length) throw new OperationError('検証用利用資格が登録されていません')
    return { status: 'revoked' as const }
  }, db)
}
