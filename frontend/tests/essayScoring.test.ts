import assert from 'node:assert/strict'
import test from 'node:test'
import { countEssayCharacters, gradeEssay, validateEssayProfile } from '../server/services/essay-scoring.ts'
import type { EssayScoringProfile } from '../shared/types/essay.ts'

const profile = (): EssayScoringProfile => ({
  id: 'synthetic-malthus', version: 1, title: '合成したルール検証用の論述', max_characters: 200,
  required_terms: [], allowed_negation_phrases: ['避けられない'],
  elements: [
    { id: 'food', label: '食料の増え方', points: 2,
      positive: [{ sequence: [['食料'], ['算術級数', '等差数列'], ['増える', '増加']] }],
      negative: [{ sequence: [['食料'], ['幾何級数', '等比数列'], ['増える', '増加']] }] },
    { id: 'population', label: '人口の増え方', points: 2,
      positive: [{ sequence: [['人口'], ['幾何級数', '等比数列'], ['増える', '増加']] }],
      negative: [{ sequence: [['人口'], ['算術級数', '等差数列'], ['増える', '増加']] }] },
    { id: 'cause', label: '人口増加と貧困の関係', points: 2,
      positive: [{ sequence: [['人口増加'], ['食料増加'], ['上回る'], ['ため'], ['貧困']] }],
      negative: [{ sequence: [['食料増加'], ['人口増加'], ['上回る'], ['ため'], ['貧困']] }] },
    { id: 'policy', label: '人口を抑える政策', points: 2,
      positive: [{ sequence: [['解決策'], ['人口'], ['抑制', '抑える']] }],
      negative: [{ sequence: [['解決策'], ['人口'], ['増やす', '増加させる']] }] },
  ],
})
const fullAnswer = '食料は算術級数的に増える。人口は幾何級数的に増加する。人口増加が食料増加を上回るため貧困化する。解決策として人口の抑制を説いた。'

test('registered relationships yield reference points and an exact input sentence as evidence', () => {
  const result = gradeEssay(profile(), fullAnswer)
  assert.equal(result.grading_status, 'complete')
  assert.equal(result.score, 8)
  assert.equal(result.confirmed_points, 8)
  assert.equal(result.pending_points, 0)
  assert.equal(result.reference_only, true)
  assert.equal(result.engine_version, 'literal-rules-v1')
  assert.ok(result.elements.every(element => element.status === 'matched'))
  assert.equal(result.elements[0]!.evidence[0], '食料は算術級数的に増える')
})

test('registered alternative wording and full-width notation match without changing character count', () => {
  const result = gradeEssay(profile(), fullAnswer.replace('算術級数', '等差数列').replace('幾何級数', '等比数列').replace('抑制', '抑える'))
  assert.equal(result.score, 8)
  assert.equal(countEssayCharacters('Ａ １\n😀。'), 4)
  assert.equal(countEssayCharacters('ｶﾞ'), 2)
  const wrapped = fullAnswer.replace('算術級数', '算術\n級数').replace('人口の抑制', '人\r\n口の抑制')
  assert.equal(gradeEssay(profile(), wrapped).score, 8)
  assert.equal(gradeEssay(profile(), wrapped).elements[0]!.evidence[0], '食料は算術\n級数的に増える')
})

test('mere keyword enumeration remains pending, rather than receiving a false zero or full score', () => {
  const result = gradeEssay(profile(), '人口　食料　幾何級数　算術級数　貧困　抑制')
  assert.equal(result.confirmed_points, 0)
  assert.equal(result.pending_points, 8)
  assert.equal(result.score, null)
  assert.equal(result.grading_status, 'pending')
})

test('swapped subjects are detected by registered negative relationships', () => {
  const result = gradeEssay(profile(), '食料は幾何級数的に増加する。人口は算術級数的に増える。人口増加が食料増加を上回るため貧困化する。解決策として人口の抑制を説いた。')
  assert.equal(result.score, 4)
  assert.equal(result.elements[0]!.status, 'contradicted')
  assert.equal(result.elements[1]!.status, 'contradicted')
  assert.equal(result.elements[0]!.awarded_points, 0)
})

test('reversed cause is not awarded as the correct relationship', () => {
  const result = gradeEssay(profile(), fullAnswer.replace('人口増加が食料増加を上回る', '食料増加が人口増加を上回る'))
  assert.equal(result.elements[2]!.status, 'contradicted')
  assert.equal(result.score, 6)
})

test('an unknown paraphrase is pending, including when the remaining elements match', () => {
  const result = gradeEssay(profile(), fullAnswer.replace('解決策として人口の抑制を説いた', 'そのため出生を控えるべきだと考えた'))
  assert.equal(result.confirmed_points, 6)
  assert.equal(result.pending_points, 2)
  assert.equal(result.score, null)
})

test('unscoped negation does not produce a false positive', () => {
  const result = gradeEssay(profile(), fullAnswer.replace('食料は算術級数的に増える', '食料は算術級数的に増えると主張しなかった'))
  assert.equal(result.elements[0]!.status, 'pending')
  assert.equal(result.confirmed_points, 6)
})

test('negating a registered wrong claim is pending rather than an incorrect assertion', () => {
  const result = gradeEssay(profile(), '食料は幾何級数的に増加しない。')
  assert.equal(result.elements[0]!.status, 'pending')
  assert.equal(result.elements[0]!.awarded_points, null)
  assert.match(result.elements[0]!.reason, /否定/)
})

test('polite and alternative negative spellings cannot earn positive points', () => {
  for (const phrase of ['増加しません', '増加することは無い', '増加するまい', '増加することはなかろう', '増加することはあり得ぬ']) {
    const result = gradeEssay(profile(), `食料は算術級数的に${phrase}。`)
    assert.equal(result.elements[0]!.status, 'pending', phrase)
    assert.equal(result.elements[0]!.awarded_points, null, phrase)
  }
})

test('an explicitly allowed negative construction does not block a valid positive claim', () => {
  const result = gradeEssay(profile(), fullAnswer.replace('貧困化する', '貧困化は避けられない'))
  assert.equal(result.score, 8)
  const stillNegative = gradeEssay(profile(), fullAnswer.replace('貧困化する', '貧困化は避けられないと主張しなかった'))
  assert.equal(stillNegative.elements[2]!.status, 'pending')
})

test('simultaneously matching positive and negative claims requires confirmation', () => {
  const result = gradeEssay(profile(), fullAnswer + '食料は幾何級数的に増える。')
  assert.equal(result.elements[0]!.status, 'pending')
  assert.equal(result.elements[0]!.evidence.length, 2)
  assert.equal(result.pending_points, 2)
  assert.equal(result.score, null)
})

test('hypothesis, quoted false examples and explicit corrections are not treated as assertions', () => {
  for (const prefix of ['仮に', 'もし', '誤りの例として', 'これは嘘であり', '訂正する。']) {
    const result = gradeEssay(profile(), prefix + fullAnswer)
    assert.equal(result.confirmed_points, 0, prefix)
    assert.equal(result.pending_points, 8, prefix)
  }
  for (const suffix of ['上記を撤回する。', 'この説明を取り消す。', '前述の内容を訂正する。']) {
    assert.equal(gradeEssay(profile(), fullAnswer + suffix).confirmed_points, 0)
  }
  assert.equal(gradeEssay(profile(), fullAnswer + 'ルイ14世は王令を撤回した。').score, 8)
  for (const prefix of ['以下は誤った説明である。', '以下は事実と異なる。']) {
    assert.equal(gradeEssay(profile(), prefix + fullAnswer).confirmed_points, 0)
  }
  for (const suffix of ['以上はすべて正しくない。', '以上の説明は正しくありません。', '上記は事実ではありません。', '実際は正反対である。', '本当ですか？', '本当か?', '正しいですか。']) {
    const result = gradeEssay(profile(), fullAnswer + suffix)
    assert.equal(result.confirmed_points, 0, suffix)
    assert.equal(result.score, null, suffix)
  }
})

test('question-specific caution patterns prevent unsupported attribution from earning points', () => {
  const p = profile()
  p.caution_patterns = [{ sequence: [['アダム=スミス', 'アダム＝スミス'], ['主張']] }]
  const result = gradeEssay(p, 'アダム＝スミスが主張した。' + fullAnswer)
  assert.equal(result.confirmed_points, 0)
  assert.equal(result.pending_points, 8)
})

test('sentence scope and maximum gap prevent joining unrelated statements', () => {
  assert.equal(gradeEssay(profile(), '食料。算術級数。増える。').elements[0]!.status, 'pending')
  assert.equal(gradeEssay(profile(), '食料.算術級数.増える.').elements[0]!.status, 'pending')
  assert.equal(gradeEssay(profile(), '食料' + 'あ'.repeat(25) + '算術級数的に増加する。').elements[0]!.status, 'pending')
  const p = profile()
  p.elements[0]!.positive = [{ sequence: [['食料'], ['算術級数'], ['増加']], scope: 'answer', max_gap: 30 }]
  assert.equal(gradeEssay(p, '食料。算術級数。増加。').elements[0]!.status, 'matched')
})

test('all matching elements cannot turn an out-of-limit or missing-required-term answer into a score', () => {
  const p = profile()
  p.max_characters = 20
  const over = gradeEssay(p, fullAnswer)
  assert.equal(over.grading_status, 'invalid')
  assert.equal(over.score, null)
  assert.equal(over.constraints.within_limit, false)
  p.max_characters = 200
  p.required_terms = ['マルサス']
  const missing = gradeEssay(p, fullAnswer)
  assert.equal(missing.grading_status, 'invalid')
  assert.deepEqual(missing.constraints.missing_required_terms, ['マルサス'])
  assert.equal(missing.score, null)
  assert.equal(gradeEssay(p, 'マルサス。' + fullAnswer).score, 8)
})

test('blank and excessive raw/visible input are invalid and cannot exhaust the matcher', () => {
  for (const answer of ['', ' \n\t', 'あ'.repeat(1001), ' '.repeat(4001) + fullAnswer]) {
    const result = gradeEssay(profile(), answer)
    assert.equal(result.grading_status, 'invalid')
    assert.equal(result.score, null)
    assert.equal(result.confirmed_points, 0)
  }
})

test('pattern matching explores later occurrences without exponential recursion', () => {
  const p = profile()
  p.elements[0]!.positive = [{ sequence: [['甲'], ['乙'], ['丙']], max_gap: 1 }]
  assert.equal(gradeEssay(p, '甲乙乙丙').elements[0]!.status, 'matched')
  const repetitive = gradeEssay(p, ('甲乙'.repeat(450) + '丙'))
  assert.equal(repetitive.score, null)
  assert.ok(['invalid', 'pending'].includes(repetitive.grading_status))
})

test('profile definitions are bounded, unique, total eight points, and literal-only', () => {
  assert.doesNotThrow(() => validateEssayProfile(profile()))
  for (const mutate of [
    (p: any) => { p.elements[0].points = 3 },
    (p: any) => { p.elements[1].id = p.elements[0].id },
    (p: any) => { p.elements[0].positive[0].max_gap = 1001 },
    (p: any) => { p.elements[0].positive[0].sequence = [[]] },
    (p: any) => { p.elements[0].positive[0].sequence = [['']] },
    (p: any) => { p.elements[0].positive[0].sequence = '.*' },
    (p: any) => { p.max_characters = 1001 },
  ]) {
    const p = profile()
    mutate(p)
    assert.throws(() => validateEssayProfile(p), TypeError)
  }
  const p = profile()
  p.elements[0]!.positive = [{ sequence: [['(a+)+$']] }]
  assert.equal(gradeEssay(p, 'aaaaaaaaaaaaa!').elements[0]!.status, 'pending')
  assert.throws(() => gradeEssay(profile(), null as any), TypeError)
})
