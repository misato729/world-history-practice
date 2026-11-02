import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { z } from 'zod'
import { query, transaction } from '../core/db.ts'
import type { User } from '../core/auth.ts'
import { fail } from '../core/errors.ts'
import { consumeRateLimit, throttle } from '../core/rate-limit.ts'
import { newPasswordSchema } from './password-validation.ts'
import { passwordResetMailSettings, sendPasswordResetMail, type ResetMailSettings } from './password-reset-mail.ts'

const requestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) })
const resetSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: newPasswordSchema, password_confirmation: z.string() })
  .refine(v => v.password === v.password_confirmation, { path: ['password_confirmation'], message: '確認用パスワードが一致していません' })
const digest = (token: string) => createHash('sha256').update(token).digest('hex')
const invalidLink = () => fail(422, 'invalid_reset_token', 'リンクが無効か、有効期限が切れています。もう一度メールを依頼してください。')

async function deliver(settings: ResetMailSettings, email: string, token: string) {
  try {
    if (!(await consumeRateLimit('password_reset_delivery', 'gas-mail')).allowed) throw new Error('Delivery limit')
    await sendPasswordResetMail(settings, email, token)
  }
  catch {
    // Relay errors may contain recipients, credentials or links. Log no details.
    console.error(JSON.stringify({ category: 'password_reset_delivery_failed' }))
    try { await query('DELETE FROM password_reset_tokens WHERE token_digest=$1', [digest(token)]) } catch { /* A later request replaces the undelivered token. */ }
  }
}

export async function handlePasswordReset(event: H3Event, parts: string[]): Promise<unknown | undefined> {
  const route = parts.join('/')
  if (event.method !== 'POST') return undefined
  if (route === 'auth/forgot-password') {
    await throttle(event, 'password_reset_request_ip')
    const parsed = requestSchema.safeParse(await readBody(event))
    if (!parsed.success) fail(422, 'validation_error', 'メールアドレスを確認してください')
    await throttle(event, 'password_reset_request_email', parsed.data.email)
    let settings: ResetMailSettings
    try { settings = passwordResetMailSettings() }
    catch { fail(503, 'password_reset_unavailable', 'メールによる再設定は現在利用できません。しばらく待ってからお試しください。') }
    const token = randomBytes(32).toString('base64url')
    const created = await transaction(async db => {
      const [user] = await query<User>('SELECT * FROM users WHERE lower(email)=$1 FOR UPDATE', [parsed.data.email], db)
      if (!user) return false
      await query(`INSERT INTO password_reset_tokens(user_id,token_digest,auth_version,expires_at)
        VALUES($1,$2,$3,CURRENT_TIMESTAMP+INTERVAL '30 minutes')
        ON CONFLICT(user_id) DO UPDATE SET token_digest=EXCLUDED.token_digest,auth_version=EXCLUDED.auth_version,
          expires_at=EXCLUDED.expires_at,created_at=CURRENT_TIMESTAMP`, [user.id, digest(token), user.auth_version ?? 0], db)
      return true
    })
    if (created) {
      // Delivery runs after the DB commit, outside the response path. Register with
      // the platform lifecycle when available; this is not a durable mail queue.
      const delivery = deliver(settings, parsed.data.email, token)
      const deferred = event as H3Event & { waitUntil?: (promise: Promise<unknown>) => void }
      deferred.waitUntil?.(delivery)
    }
    setResponseStatus(event, 202)
    return { data: { message: '登録されているメールアドレスの場合、再設定用のメールを送信します。メールが届くまで少しお待ちください。' } }
  }
  if (route === 'auth/reset-password') {
    await throttle(event, 'password_reset_submit')
    const parsed = resetSchema.safeParse(await readBody(event))
    if (!parsed.success) fail(422, 'validation_error', '入力内容を確認してください', z.flattenError(parsed.error).fieldErrors)
    const input = parsed.data
    await transaction(async db => {
      const [owner] = await query<{ user_id: number }>('SELECT user_id FROM password_reset_tokens WHERE token_digest=$1', [digest(input.token)], db)
      if (!owner) invalidLink()
      // Match the user -> token lock order used when issuing/replacing a token.
      const [user] = await query<User>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [owner!.user_id], db)
      const [valid] = await query('SELECT auth_version FROM password_reset_tokens WHERE user_id=$1 AND token_digest=$2 AND expires_at>clock_timestamp() FOR UPDATE', [owner!.user_id, digest(input.token)], db)
      if (!user || !valid || valid.auth_version !== (user.auth_version ?? 0)) invalidLink()
      if (await bcrypt.compare(input.password, user!.password_digest)) fail(422, 'validation_error', '新しいパスワードは現在と異なるものを入力してください')
      await query('UPDATE users SET password_digest=$1,auth_version=auth_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [await bcrypt.hash(input.password, 12), user!.id], db)
      await query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user!.id], db)
    })
    return { data: { message: 'パスワードを再設定しました。新しいパスワードでログインしてください。' } }
  }
  return undefined
}
