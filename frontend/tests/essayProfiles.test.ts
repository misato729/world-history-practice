import test from 'node:test'
import assert from 'node:assert/strict'
import { essayRuleProfiles, getEssayRuleProfile } from '../server/data/essay-rule-profiles.ts'
import { gradeEssay, validateEssayProfile } from '../server/services/essay-scoring.ts'
import { essayModelAnswers, essayRuleCases } from './fixtures/essayRuleCases.ts'

test('12 profiles retain 53 source rubric elements, 8 points, and distinct stable ids', () => {
  assert.equal(essayRuleProfiles.length, 12)
  assert.equal(new Set(essayRuleProfiles.map(profile => profile.id)).size, 12)
  assert.equal(essayRuleProfiles.reduce((n, profile) => n + profile.elements.length, 0), 53)
  assert.deepEqual(Object.keys(essayModelAnswers).sort(), essayRuleProfiles.map(profile => profile.id).sort())
  for (const profile of essayRuleProfiles) {
    validateEssayProfile(profile)
    assert.equal(profile.version, 1)
    assert.equal(profile.elements.reduce((n, item) => n + item.points, 0), 8)
    assert.equal(getEssayRuleProfile(profile.id, profile.version), profile)
    assert.equal(getEssayRuleProfile(profile.id, 999), undefined)
    assert.ok(essayRuleCases.filter(item => item.profile_id === profile.id).length >= 8)
  }
})

for (const item of essayRuleCases) {
  test(`${item.profile_id}: ${item.name}`, () => {
    const profile = getEssayRuleProfile(item.profile_id, 1)
    assert.ok(profile)
    const result = gradeEssay(profile, item.answer)
    assert.equal(result.reference_only, true)
    assert.equal(result.max_points, 8)
    if (item.expected_confirmed_points !== undefined) assert.equal(result.confirmed_points, item.expected_confirmed_points, JSON.stringify(result.elements))
    if ('expected_score' in item) assert.equal(result.score, item.expected_score)
    if (item.expected_grading_status) assert.equal(result.grading_status, item.expected_grading_status)
    for (const id of item.must_match ?? []) assert.equal(result.elements.find(element => element.id === id)?.status, 'matched', JSON.stringify(result.elements))
    for (const id of item.must_not_match ?? []) assert.notEqual(result.elements.find(element => element.id === id)?.status, 'matched', JSON.stringify(result.elements))
    for (const id of item.must_pending ?? []) assert.equal(result.elements.find(element => element.id === id)?.status, 'pending', JSON.stringify(result.elements))
    if (item.expect_unsettled) assert.notEqual(result.score, 8)
    assert.equal(result.confirmed_points, result.elements.reduce((n, element) => n + (element.awarded_points ?? 0), 0))
    assert.equal(result.pending_points, result.elements.reduce((n, element) => n + (element.status === 'pending' ? element.points : 0), 0))
  })
}
