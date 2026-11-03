import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {createApp,defineEventHandler,toNodeListener,setResponseStatus,getHeader} from 'h3'
import {handleUpdates} from '../server/services/updates.ts'
import {migrate} from '../server/database/migrate.ts'
import {getDatabase,closeDatabase} from '../server/core/db.ts'
process.env.APP_ENV='test'
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL

test('updates migration, public ordering, role boundaries, validation, CRUD and conflicts',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 assert.match(new URL(process.env.TEST_DATABASE_URL!).pathname,/_test$/)
 await migrate();assert.deepEqual((await migrate()).applied,[])
 const db=await getDatabase().connect();await db.query('BEGIN')
 const app=createApp().use(defineEventHandler(async event=>{
  const role=getHeader(event,'x-test-role'),user=role?{id:1,role}:null
  try{return await handleUpdates(event,event.path.slice(1).split('/'),user as any,db)}catch(e:any){setResponseStatus(event,e.status??e.statusCode??500);return {error:{code:e.code,message:e.message}}}
 }))
 const server=createServer(toNodeListener(app));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address()as any).port
 const request=async(path:string,method='GET',body?:any,role?:string)=>{const r=await fetch(`http://127.0.0.1:${port}/${path}`,{method,headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()as any}}
 try{
  const initial=await request('updates');assert.equal(initial.status,200);assert.deepEqual(initial.body.data.map((r:any)=>[r.published_on,r.content]),[['2026-11-03','機能改善・機能追加を行いました'],['2026-11-02','機能改善・機能追加を行いました'],['2026-11-01','本サービスをリリースしました']])
  const value={published_on:'2026-11-04',content:'合成更新'}
  assert.equal((await request('admin/updates','POST',value)).status,401)
  assert.equal((await request('admin/updates','POST',value,'user')).status,403)
  for(const content of ['', ' '.repeat(2),'a'.repeat(2001)])assert.equal((await request('admin/updates','POST',{...value,content},'admin')).status,422)
  assert.equal((await request('admin/updates','POST',{...value,published_on:'2026-02-30'},'admin')).status,422)
  assert.equal((await request('admin/updates')).status,401)
  assert.equal((await request('admin/updates','GET',undefined,'user')).status,403)
  assert.equal((await request('admin/updates/1','DELETE',{lock_version:2147483648},'admin')).status,422)
  const created=await request('admin/updates','POST',value,'admin');assert.equal(created.status,201);const id=created.body.data.id
  assert.equal((await request('updates')).body.data[0].id,id)
  assert.equal((await request(`admin/updates/${id}`,'PATCH',{...value,content:'変更後',lock_version:0},'admin')).status,200)
  assert.equal((await request(`admin/updates/${id}`,'PATCH',{...value,lock_version:0},'admin')).status,409)
  assert.equal((await request(`admin/updates/${id}`,'DELETE',{lock_version:0},'admin')).status,409)
  assert.equal((await request(`admin/updates/${id}`,'DELETE',{lock_version:1},'admin')).status,200)
  assert.equal((await request(`admin/updates/${id}`,'DELETE',{lock_version:1},'admin')).status,409)
  assert.equal((await request('updates')).body.data.length,3)
  await migrate(db);assert.equal((await request('updates')).body.data.length,3)
 }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await db.query('ROLLBACK');db.release();await closeDatabase()}
})
