import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

const app = new URL('../app/', import.meta.url)
const css = readFileSync(new URL('assets/css/main.css', app), 'utf8')

function sources(folder: URL): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), folder)
    return entry.isDirectory() ? sources(path) : /\.(vue|css)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  })
}

test('one root baseline scales inherited and rem-based text to ninety percent', () => {
  assert.match(css, /html\s*\{[^}]*font-size:\s*90%/)
  assert.match(css, /button, input, select, textarea\s*\{\s*font:\s*inherit/)
  assert.doesNotMatch(css, /\bzoom\s*:|transform:\s*scale\(/)
})

test('screen typography does not bypass the root scale or depend on viewport width', () => {
  for (const source of sources(app)) {
    for (const [, size] of source.matchAll(/font-size:\s*([^;}]+)/g)) {
      if (size === 'max(1rem, 16px) !important') continue
      assert.doesNotMatch(size!, /\dpx|\d(?:vw|vh|vmin|vmax)/)
    }
  }
})

test('mobile editable controls retain a focus-safe minimum without shrinking hit areas', () => {
  assert.match(css, /@media \(max-width: 760px\)\s*\{[\s\S]*:root :is\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\), select, textarea\)/)
  assert.match(css, /font-size: max\(1rem, 16px\) !important/)
  assert.match(css, /\.primary-link, \.secondary-link\s*\{\s*min-height: 46px/)
})

test('the header does not squeeze the brand beside signed-in actions', () => {
  const header = readFileSync(new URL('components/SiteHeader.vue', app), 'utf8')
  assert.match(header, /<SiteLogo class="brand-logo"\s*\/>/)
  assert.match(header, /\.brand-logo\s*\{\s*flex-shrink:\s*0/)
})
