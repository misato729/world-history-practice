import { defineNitroPlugin } from 'nitropack/runtime'
import { secretKey } from '../core/config.ts'
import { allowedOrigins } from '../core/http.ts'
import { closeDatabase, query } from '../core/db.ts'

export default defineNitroPlugin(async (nitro) => {
  secretKey()
  allowedOrigins()
  await query('SELECT 1')
  nitro.hooks.hook('close', closeDatabase)
})
