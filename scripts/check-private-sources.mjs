#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_REPO = fileURLToPath(new URL('../', import.meta.url))
export function isPrivateSource(path) {
  const parts = String(path).normalize('NFC').replaceAll('\\', '/').split('/')
  return parts.some(part => part.toLowerCase() === 'past-exam' || part === '分析' || /^glossary/i.test(part))
    || parts.some(part => /^歴検1級世界史_.*\.(pdf|zip)$/i.test(part))
}
function git(repo, args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 15000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
}
const paths = output => [...new Set(output.split('\0').map(path => path.replace(/^\n+/, '')).filter(Boolean))]

/** Inspect names only, including deleted historical files. Never read source blobs. */
export function inspect(repo = DEFAULT_REPO, revisions = []) {
  for (const ref of revisions) if (!/^[0-9a-f]{40,64}$/i.test(ref)) throw new Error('Invalid revision')
  const tracked = paths(git(repo, ['ls-files', '-z'])).filter(isPrivateSource)
  const history = paths(git(repo, ['log', '--format=', '--name-only', '-z', ...(revisions.length ? revisions : ['--all']), '--'])).filter(isPrivateSource)
  return { tracked, history }
}

export function main(argv = [], repo = DEFAULT_REPO, input = '') {
  try {
    if (argv.some(arg => arg !== '--pre-push') || argv.length > 1) throw new Error('Invalid arguments')
    let revisions = []
    if (argv.includes('--pre-push')) {
      const lines = input.trim() ? input.trim().split(/\r?\n/) : []
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length !== 4 || !/^[0-9a-f]{40,64}$/i.test(parts[1]) || !/^[0-9a-f]{40,64}$/i.test(parts[3])) throw new Error('Invalid push metadata')
        if (!/^0+$/.test(parts[1])) revisions.push(parts[1])
      }
      // No update/deletion-only pushes need no outgoing history scan. Still check the index.
      if (revisions.length === 0) {
        const tracked = paths(git(repo, ['ls-files', '-z'])).filter(isPrivateSource)
        if (tracked.length) { console.error(`送信を中止しました。ローカル専用資料がGitの追跡対象にあります（${tracked.length}件）。`); return 1 }
        console.log('ローカル専用資料の送信検査: 成功（送信する履歴なし）')
        return 0
      }
    }
    const result = inspect(repo, [...new Set(revisions)])
    if (result.tracked.length || result.history.length) {
      console.error(`送信を中止しました。ローカル専用資料を検出しました（追跡${result.tracked.length}件・履歴${result.history.length}件）。削除済みの資料も履歴から送信されるため、確認が必要です。`)
      return 1
    }
    console.log('ローカル専用資料のGit追跡・履歴検査: 成功')
    return 0
  } catch {
    console.error('ローカル専用資料の送信検査を完了できません。Gitの状態・参照を確認するまで送信を中止します。')
    return 1
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), DEFAULT_REPO, process.argv.includes('--pre-push') ? readFileSync(0, 'utf8') : '')
}
