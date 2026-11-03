import { getMethod, readBody, setResponseStatus, type H3Event } from 'h3'
import type { User } from '../core/auth.ts'
import { query, type Database } from '../core/db.ts'
import { fail } from '../core/errors.ts'
import type { ServiceUpdate } from '../../shared/types/updates.ts'
const columns = "id,to_char(published_on,'YYYY-MM-DD') AS published_on,content,lock_version"
export function validateUpdate(raw: unknown) {
 const v = raw as Record<string,unknown> | null
 if (!v || typeof v.published_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.published_on) || v.published_on < '0001-01-01' || !Number.isFinite(Date.parse(v.published_on+'T00:00:00Z')) || new Date(v.published_on+'T00:00:00Z').toISOString().slice(0,10) !== v.published_on || typeof v.content !== 'string' || !v.content.trim() || [...v.content.trim()].length > 2000) fail(422,'validation_error','有効な日付と1〜2000文字の内容を入力してください')
 return {published_on:v!.published_on as string,content:(v!.content as string).trim()}
}
export const listUpdates = (db?:Database) => query<ServiceUpdate>(`SELECT ${columns} FROM service_updates ORDER BY published_on DESC,id DESC`,[],db)
export async function handleUpdates(event:H3Event,parts:string[],user:User|null,db?:Database) {
 const method=getMethod(event), path=parts.join('/')
 if (path==='updates' && method==='GET') return {data:await listUpdates(db)}
 if (parts[0]!=='admin' || parts[1]!=='updates') return undefined
 if (!user) fail(401,'unauthorized','ログインが必要です')
 if (user!.role!=='admin') fail(403,'forbidden','管理者権限が必要です')
 if (parts.length===2 && method==='GET') return {data:await listUpdates(db)}
 if (parts.length===2 && method==='POST') {
  const v=validateUpdate(await readBody(event)); const [row]=await query<ServiceUpdate>(`INSERT INTO service_updates(published_on,content) VALUES($1,$2) RETURNING ${columns}`,[v.published_on,v.content],db)
  setResponseStatus(event,201);return {data:row}
 }
 if (parts.length===3 && ['PATCH','DELETE'].includes(method)) {
  const id=Number(parts[2]);if (!/^[1-9]\d*$/.test(parts[2]!)||!Number.isSafeInteger(id))fail(400,'bad_request','更新履歴を確認してください')
  const raw=await readBody(event);if(!Number.isSafeInteger(raw?.lock_version)||raw.lock_version<0||raw.lock_version>2147483647)fail(422,'validation_error','更新版を確認してください')
  let rows:ServiceUpdate[]
  if(method==='PATCH'){const v=validateUpdate(raw);rows=await query<ServiceUpdate>(`UPDATE service_updates SET published_on=$1,content=$2,lock_version=lock_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND lock_version=$4 AND lock_version<2147483647 RETURNING ${columns}`,[v.published_on,v.content,id,raw.lock_version],db)}
  else rows=await query<ServiceUpdate>(`DELETE FROM service_updates WHERE id=$1 AND lock_version=$2 RETURNING ${columns}`,[id,raw.lock_version],db)
  if(!rows.length)fail(409,'update_conflict','他の操作で変更または削除されています。再読み込み後に対象の「編集」を選び直してください')
  return {data:rows[0]}
 }
 return undefined
}
