import assert from 'node:assert/strict'
import test from 'node:test'
import { passwordResetToken } from '../app/utils/passwordReset.ts'

test('reset fragments accept exactly one correctly sized secret and reject query-style or duplicated values', () => {
  const value = 'A'.repeat(43)
  assert.equal(passwordResetToken('#token=' + value).length, 43)
  for (const hash of ['', '?token=' + value, '#token=short', '#token=' + 'a'.repeat(44), '#token=' + value + '&token=' + value, '#token=' + 'a'.repeat(600), '#token=' + 'a'.repeat(42) + '%2B']) {
    assert.equal(passwordResetToken(hash), '')
  }
})
