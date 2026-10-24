import pg from 'pg'
import type { Pool, PoolClient } from 'pg'

export type Database = Pick<Pool | PoolClient, 'query'>
let pool: Pool | undefined
// Rails stored UTC values in timestamp-without-time-zone columns. Preserve that
// convention even when a developer runs Node in Asia/Tokyo or another zone.
pg.defaults.parseInputDatesAsUTC = true
pg.types.setTypeParser(1114, (value: string) => new Date(value.replace(' ', 'T') + 'Z'))
pg.types.setTypeParser(20, (value: string) => {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) throw new Error('Database integer exceeds the safe range')
  return number
})

export function getDatabase(): Pool {
  if (!pool) {
    pool = new pg.Pool(process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      options: '-c timezone=UTC',
    } : {
      host: process.env.PGHOST || process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'world_history_development',
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'world_history',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
      max: 10,
      options: '-c timezone=UTC',
    })
    // A disconnected idle client must not terminate the HTTP process.
    pool.on('error', () => console.error('Database connection unavailable'))
  }
  return pool
}

export async function query<T = Record<string, any>>(text: string, values: unknown[] = [], db: Database = getDatabase()): Promise<T[]> {
  const result = await db.query(text, values)
  return (Array.isArray(result) ? [] : result.rows || []) as T[]
}

export async function transaction<T>(action: (db: Database) => Promise<T>, existing?: Database): Promise<T> {
  if (existing) return action(existing)
  const client = await getDatabase().connect()
  try {
    await client.query('BEGIN')
    const value = await action(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function closeDatabase() {
  if (pool) await pool.end()
  pool = undefined
}
