import bcrypt from 'bcryptjs'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { z } from 'zod'
import { query, transaction } from '../core/db.ts'
import { issueToken, userPayload, TOKEN_LIFETIME, type User } from '../core/auth.ts'
import { fail } from '../core/errors.ts'
import { throttle } from '../core/rate-limit.ts'
import { expirePendingCheckouts } from './payments.ts'
import type { AuthSession } from '../../shared/types/auth.ts'

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).refine(value => Buffer.byteLength(value) <= 72, 'パスワードは72バイト以内で入力してください'),
  password_confirmation: z.string().optional(),
}).refine(value => value.password_confirmation === undefined || value.password_confirmation === value.password, { path: ['password_confirmation'], message: 'パスワードと一致しません' })

const passwordChangeSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(8, '新しいパスワードは8文字以上で入力してください').refine(value => Buffer.byteLength(value) <= 72, '新しいパスワードは72バイト以内で入力してください'),
  password_confirmation: z.string(),
}).refine(value => value.password_confirmation === value.password, { path: ['password_confirmation'], message: '確認用パスワードが一致していません' })

export async function createAccount(input: unknown) {
  const result = signupSchema.safeParse(input)
  if (!result.success) fail(422, 'validation_error', '入力内容を確認してください', z.flattenError(result.error).fieldErrors)
  const values = result.data
  try {
    return (await query<User>(`INSERT INTO users(name,email,password_digest,role,created_at,updated_at) VALUES($1,$2,$3,'user',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`, [values.name, values.email, await bcrypt.hash(values.password, 12)]))[0]!
  } catch (error) {
    if ((error as { code?: string }).code === '23505') fail(422, 'validation_error', '入力内容を確認してください', { email: ['はすでに存在します'] })
    throw error
  }
}

export async function sessionPayload(user: User): Promise<AuthSession> {
  return { access_token: issueToken(user), token_type: 'Bearer', expires_in: TOKEN_LIFETIME, user: await userPayload(user) }
}

export async function handleAccounts(event: H3Event, parts: string[], user: User | null): Promise<unknown | undefined> {
  const route = parts.join('/')
  if (event.method === 'PATCH' && route === 'me/password') {
    if (!user) fail(401, 'unauthorized', 'ログインが必要です')
    await throttle(event, 'password_change', String(user.id))
    const result = passwordChangeSchema.safeParse(await readBody(event))
    if (!result.success) fail(422, 'validation_error', '入力内容を確認してください', z.flattenError(result.error).fieldErrors)
    const values = result.data
    const updated = await transaction(async db => {
      const [locked] = await query<User>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [user.id], db)
      if (!locked || (locked.auth_version ?? 0) !== (user.auth_version ?? 0)) fail(401, 'unauthorized', 'ログインが必要です')
      if (!await bcrypt.compare(values.current_password, locked.password_digest)) fail(422, 'validation_error', '現在のパスワードを確認してください', { current_password: ['が正しくありません'] })
      if (await bcrypt.compare(values.password, locked.password_digest)) fail(422, 'validation_error', '新しいパスワードは現在と異なるものを入力してください')
      return (await query<User>('UPDATE users SET password_digest=$1,auth_version=auth_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [await bcrypt.hash(values.password, 12), user.id], db))[0]!
    })
    return { data: await sessionPayload(updated) }
  }
  if (event.method === 'POST' && route === 'auth/signup') {
    await throttle(event, 'signup')
    const created = await createAccount(await readBody(event))
    setResponseStatus(event, 201)
    return { data: await sessionPayload(created) }
  }
  if (event.method === 'POST' && route === 'auth/login') {
    await throttle(event, 'login')
    const input = await readBody(event)
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : ''
    const [account] = await query<User>('SELECT * FROM users WHERE email=$1', [email])
    const password = typeof input?.password === 'string' ? input.password : ''
    if (!account || !await bcrypt.compare(password, account.password_digest)) fail(401, 'unauthorized', 'メールアドレスまたはパスワードが正しくありません')
    return { data: await sessionPayload(account) }
  }
  if (route === 'me' && ['GET', 'DELETE'].includes(event.method)) {
    if (!user) fail(401, 'unauthorized', 'ログインが必要です')
    if (event.method === 'GET') return { data: await userPayload(user) }
    const input = await readBody(event)
    await transaction(async (db) => {
      const [locked] = await query<User>('SELECT * FROM users WHERE id=$1 FOR UPDATE', [user.id], db)
      if (!locked) fail(404, 'not_found', '対象が見つかりません')
      if ((locked.auth_version ?? 0) !== (user.auth_version ?? 0)) fail(401, 'unauthorized', 'ログインが必要です')
      if (typeof input?.current_password !== 'string' || !await bcrypt.compare(input.current_password, locked.password_digest)) fail(422, 'validation_error', '現在のパスワードを確認してください', { current_password: ['が正しくありません'] })
      await expirePendingCheckouts(locked, db)
      await query('DELETE FROM users WHERE id=$1', [user.id], db)
    })
    setResponseStatus(event, 204)
    return ''
  }
  return undefined
}
