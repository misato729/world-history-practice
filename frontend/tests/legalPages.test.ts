import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = (name: string) => readFileSync(new URL(`../app/pages/${name}.vue`, import.meta.url), 'utf8')

test('legal pages are accessible without application login', () => {
  for (const name of ['terms', 'privacy-policy', 'commercial-disclosure']) {
    const page = source(name)
    assert.doesNotMatch(page, /middleware\s*:\s*['"](?:auth|admin)/)
    assert.doesNotMatch(page, /(?:authenticate|ensureCurrentUser|authHeaders)/)
    assert.match(page, /SITE.name/)
    assert.doesNotMatch(page, /情報教認|高等学校|2026年10月21日/)
  }
})

test('premium policies disclose one-time purchase and preserve advertising privacy', () => {
  for (const name of ['terms', 'privacy-policy', 'commercial-disclosure']) {
    assert.doesNotMatch(source(name), /テンプレートの草案|公開前に完成/)
  }
  const terms = source('terms')
  assert.match(terms, /PRICE_LABEL/)
  assert.match(terms, /月額料金および自動更新はありません/)
  assert.match(terms, /全額返金、支払取消し、異議申立て/)
  assert.match(terms, /お気に入り機能は、有効なプレミアム会員資格/)
  const privacy = source('privacy-policy')
  assert.match(privacy, /StripeのCheckout Session ID、PaymentIntent ID、Charge ID/)
  assert.match(privacy, /https:\/\/stripe\.com\/jp\/privacy/)
  assert.match(privacy, /Google AdSense/)
  assert.match(privacy, /adssettings\.google\.com\/partnerads/)
  assert.match(privacy, /SITE.contact_email/)
  assert.match(privacy, /mailto:/)
})

test('commercial disclosure retains seller readiness checks and request-based contact disclosure', () => {
  const page = source('commercial-disclosure')
  assert.match(page, /isSellerInformationComplete\(seller.value\)/)
  assert.match(page, /請求があった場合に遅滞なく開示/)
  assert.match(page, /購入前の請求にも/)
  assert.match(page, /申込みの意思決定に先立って十分な時間的余裕/)
  assert.match(page, /PRICE_LABEL/)
  assert.match(page, /immediate: PAYMENTS_ENABLED/)
})
