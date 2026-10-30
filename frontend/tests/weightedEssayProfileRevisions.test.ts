import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeightedEssayProfileRevisions } from '../server/data/weighted-essay-profile-revisions.ts'
import { essayRuleProfiles } from '../server/data/essay-rule-profiles.ts'
import { gradeEssay, validateEssayProfile } from '../server/services/essay-scoring.ts'
import { essayModelAnswers, essayRuleCases } from './fixtures/essayRuleCases.ts'

const legacy = essayRuleProfiles.filter(item => item.version === 1)
const before = JSON.stringify(legacy)
const revisions = buildWeightedEssayProfileRevisions(legacy)

test('weighted revisions retain old versions and require four complete two-point elements', () => {
  assert.equal(JSON.stringify(legacy), before)
  assert.equal(revisions.length, 3)
  for (const profile of revisions) {
    validateEssayProfile(profile)
    assert.equal(profile.version, 2)
    assert.deepEqual(profile.elements.map(item => item.points), [2, 2, 2, 2])
    assert.equal(gradeEssay(profile, essayModelAnswers[profile.id]!).score, 8)
    const alternative = essayRuleCases.find(item => item.profile_id === profile.id && item.name === '許容する言い換え')
    assert.ok(alternative)
    assert.equal(gradeEssay(profile, alternative.answer).score, 8)
  }
})

const enclosure = revisions[0]!
const industry = revisions[1]!
const hygiene = revisions[2]!
const cases: [string, typeof enclosure, string, string[]][] = [
  ['囲い込みの第1次時期だけでは目的を含む要素を加点しない', enclosure, '第1次は15世紀末から17世紀半ばに進んだ。', ['e1']],
  ['囲い込みの第1次目的だけでは時期を含む要素を加点しない', enclosure, '第1次は毛織物市場の拡大を背景に牧羊地へ転換した。', ['e1']],
  ['第2次の人口増加だけでは穀物不足の説明を代替しない', enclosure, '第2次は18〜19世紀、人口増加から穀物増産を進めた。', ['e2']],
  ['土地喪失だけでは工場労働者と産業革命の因果を加点しない', enclosure, '土地を失った農民が都市へ移り工場労働者となった。', ['e4']],
  ['囲い込みの二つの時期と目的を逆にした説明を加点しない', enclosure, '第1次は18〜19世紀、穀物増産を進めた。第2次は15世紀末から17世紀半ば、牧羊地に転換した。', ['e1', 'e2']],
  ['第1次の動力だけでは中心産業を含む要素を加点しない', industry, '第1次は石炭を燃料とする蒸気機関を利用した。', ['e2']],
  ['第1次の中心産業だけでは動力を含む要素を加点しない', industry, '第1次は綿工業を中心に進んだ。', ['e2']],
  ['第2次の電力だけでは石油を含む要素を加点しない', industry, '第2次は電力を動力源とし重化学工業を中心に進んだ。', ['e4']],
  ['第2次の中心産業だけではエネルギー源を含む要素を加点しない', industry, '第2次は重化学工業を中心に進んだ。', ['e4']],
  ['動力と中心産業を逆にした説明を加点しない', industry, '第1次は石油で蒸気機関を利用し、重化学工業を中心に進んだ。第2次は石炭だけを動力源として綿工業を中心に進んだ。', ['e2', 'e4']],
  ['同一文で別主体をまたぐ一致を保留する', industry, '第1次は石炭と蒸気機関を利用し、第2次は綿工業を中心に進んだ。', ['e2']],
  ['列挙だけでは因果や関係を確認しない', industry, '第1次、18世紀後半、イギリス、石炭、蒸気機関、綿工業。第2次、1870年代、電力、石油、重化学工業。', ['e1', 'e2', 'e3', 'e4']],
  ['動力と中心という名詞を含む第1次の列挙も加点しない', industry, '第1次、石炭、蒸気機関、利用、綿工業、中心。', ['e2']],
  ['動力と中心という名詞を含む第2次の列挙も加点しない', industry, '第2次、電力、石油、新動力源、重化学工業、中心。', ['e4']],
  ['囲い込みも関係のない動詞を添えた語句列挙では加点しない', enclosure, '第1次、15世紀末、17世紀半ば、毛織物市場、拡大、牧羊、転換した。第2次、18〜19世紀、人口増加、穀物不足、議会、承認、穀物増産、進めた。', ['e1', 'e2', 'e3']],
]
for (const [name, profile, answer, ids] of cases) test(name, () => {
  const result = gradeEssay(profile, answer)
  for (const id of ids) assert.notEqual(result.elements.find(item => item.id === id)?.status, 'matched')
  assert.notEqual(result.score, 8)
})

for (const profile of revisions) {
  test(`${profile.id}: 否定・正誤併記・未知表現を確定点にしない`, () => {
    const model = essayModelAnswers[profile.id]!
    const negated = gradeEssay(profile, model.replaceAll('進めた', '進めなかった').replaceAll('進んだ', '進まなかった').replaceAll('悪化し', '悪化しなかったので'))
    assert.ok(negated.elements.some(item => item.status === 'pending'))
    assert.equal(negated.score, null)
    assert.equal(gradeEssay(profile, model + '以上の説明は誤りである。').confirmed_points, 0)
    const unknown = gradeEssay(profile, '独自の表現で歴史の展開を記した。')
    assert.equal(unknown.confirmed_points, 0)
    assert.equal(unknown.score, null)
  })
}

test('公衆衛生の追加言い換えは環境悪化を認め、未変更の3要素を保持する', () => {
  const old = legacy.find(item => item.id === hygiene.id)!
  assert.deepEqual(hygiene.elements.slice(1), old.elements.slice(1))
  const answer = essayModelAnswers[hygiene.id]!.replace('住宅', '住居').replace('悪化', '劣悪化')
  assert.equal(gradeEssay(hygiene, answer).score, 8)
  assert.equal(gradeEssay(hygiene, '産業革命期の都市では生活環境と住宅が劣悪化した。').elements[0]!.status, 'matched')
  for (const text of [
    '産業革命期の都市の住宅と生活環境は改善した。',
    '産業革命期の都市の住宅と生活環境は悪化しなかった。',
    '産業革命、都市、住宅、生活環境、悪化。',
  ]) assert.notEqual(gradeEssay(hygiene, text).elements[0]!.status, 'matched')
})
