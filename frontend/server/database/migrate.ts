import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, transaction, type Database } from '../core/db.ts'

const directory = () => process.env.MIGRATIONS_DIR ? resolve(process.env.MIGRATIONS_DIR) : fileURLToPath(new URL('./migrations/', import.meta.url))
export const MIGRATION_LOCK = 71514346

/** Apply numbered SQL files atomically. Existing Rails tables and records survive adoption. */
export async function migrate(database?: Database): Promise<{ applied: string[] }> {
  const apply = async (db: Database) => {
    await query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK], db)
    await query(`CREATE TABLE IF NOT EXISTS nitro_schema_migrations (
      version varchar(255) PRIMARY KEY, sha256 varchar(64) NOT NULL,
      applied_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, [], db)
    const history = await query<{ version: string, sha256: string }>('SELECT version, sha256 FROM nitro_schema_migrations', [], db)
    const known = new Map(history.map(row => [row.version, row.sha256]))
    const applied: string[] = []
    const migrations = directory()
    const names = (await readdir(migrations)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort()
    if (!names.length) throw new Error('SQL migrationが見つかりません。MIGRATIONS_DIRと配置を確認してください')
    for (const name of names) {
      const sql = await readFile(join(migrations, name), 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      if (known.has(name)) {
        if (known.get(name) !== checksum) throw new Error('適用済みSQL migrationが変更されています。新しいmigrationを追加してください')
        continue
      }
      await query(sql, [], db)
      await query('INSERT INTO nitro_schema_migrations(version, sha256) VALUES($1, $2)', [name, checksum], db)
      applied.push(name)
    }
    return { applied }
  }
  // Supplied connections belong to an enclosing transaction, e.g. a restore drill.
  return database ? apply(database) : transaction(apply)
}
