import assert from 'node:assert/strict'
import test from 'node:test'
import { NEW_CURRICULUM_ESSAY_PROFILES } from '../server/data/new-curriculum-essay-profiles.ts'
import { gradeEssay, validateEssayProfile } from '../server/services/essay-scoring.ts'

export const newCurriculumEssayCases = [
  {
    id: 'new-curriculum-06-g01-q03', weights: [3, 3, 2],
    model: 'アッシリアは街道に宿駅を設け、交代で情報を運んだ。インカは道路網を飛脚が走って命令を中継した。遠隔地との連絡を保つ両者の仕組みは、広域支配を支えた。',
    alternatives: [
      'アッシリアでは街道の宿駅で交代して情報を中継した。インカでは道路を飛脚が走り、命令を伝えた。両国とも遠隔地への情報伝達によって広域支配を支えた。',
      'アッシリア王国は街道に宿駅を置いて交代で情報を伝えた。インカ帝国は道路網の飛脚が交代して情報を伝えた。いずれも遠方との連絡網が広い領土の統治を支えた。',
    ],
    clauses: [
      'アッシリアは街道に宿駅を設け、交代で情報を運んだ。インカ。',
      'アッシリア。インカは道路網を飛脚が走って命令を中継した。',
      'アッシリアとインカ。両国とも遠隔地への情報伝達によって広域支配を支えた。',
    ],
    contradictions: [
      'アッシリアは宿駅を廃止して情報を運んだ。インカ。',
      'アッシリア。インカは鉄道で命令を伝えた。',
      'アッシリアとインカ。両国の情報伝達網が広域支配を妨げた。',
    ],
    wrongActor: 'インカは街道に宿駅を設け、交代で情報を運んだ。アッシリアは道路網を飛脚が走って命令を中継した。',
    list: 'アッシリア、街道、宿駅、交代、情報、インカ、道路網、飛脚、命令、遠隔地、広域支配。',
  },
  {
    id: 'new-curriculum-06-g03-q07', weights: [3, 3, 2],
    model: 'イギリスの産業革命で機械製綿布がインドへ流入した。インドの綿織物業は衰退し、綿布の輸出地から輸入市場となり、綿花などの原料供給地へ組み込まれた。',
    alternatives: [
      '英国の産業革命で機械製綿布がインドに流入した。インドでは綿織物業が衰え、綿布を輸入する市場となり、綿花の供給地に変わった。',
      '英国の綿工業の機械化で安い綿製品がインドに流入した。インドの綿工業が衰退し、イギリス製綿布の輸入市場となり、綿花の供給地となった。',
    ],
    clauses: [
      'イギリスの産業革命で機械製綿布がインドへ流入した。',
      'インドの綿織物業は衰退し、綿布の輸出地から輸入市場となった。',
      'インドは綿花の原料供給地となった。',
    ],
    contradictions: [
      'インドの産業革命で機械製綿布がイギリスへ流入した。',
      'インドの綿織物業は発展し、綿布の輸出地となった。',
      'インドは綿花の供給地から輸入地に変わった。',
    ],
    wrongActor: 'インドの産業革命で機械製綿布がイギリスへ流入した。イギリスは綿花の原料供給地となった。',
    list: 'イギリス、産業革命、機械製綿布、インド、流入、綿織物業、衰退、輸入市場、綿花、原料供給地。',
  },
  {
    id: 'new-curriculum-07-g02-q06', weights: [2, 2, 2, 2],
    model: '輸入工業品を国内生産に替えて工業化を進めようとした。従属理論は、先進国に従属する国際分業が途上国の発展を妨げると捉えた。',
    alternatives: [
      '輸入していた工業品を国内で生産して自国の工業化を目指した。従属理論では、先進国への従属的な国際分業が開発途上国の発展を妨げると考えた。',
      '輸入品を自国で生産して国内工業を育成した。従属理論は途上国が先進国に従属する国際分業によって発展が阻害されると説明した。',
    ],
    clauses: [
      '輸入工業品を国内生産に替えた。',
      '輸入代替工業化は自国の工業化を目指した。',
      '従属理論は、途上国が先進国に従属する国際分業を捉えた。',
      '従属理論は、先進国に従属する国際分業が途上国の発展を妨げると捉えた。',
    ],
    // The final clause confirms both the stated relation and its causal interpretation.
    clausePoints: [2, 2, 2, 4],
    contradictions: [
      '輸入代替工業化は工業品の輸入拡大を目指した。',
      '輸入代替工業化は国内工業の縮小を目指した。',
      '従属理論は先進国が途上国に従属する国際分業と捉えた。',
      '途上国の発展の遅れが先進国への従属を生むと説明した。',
    ],
    wrongActor: '重商主義は、先進国に従属する国際分業が途上国の発展を妨げると捉えた。',
    list: '輸入代替工業化、輸入工業品、国内生産、工業化、従属理論、先進国、従属、国際分業、途上国、発展、妨げる。',
  },
  {
    id: 'new-curriculum-07-g04-q03', weights: [2, 2, 2, 2],
    model: '参政権など政治上の平等が進んでも、賃金格差や家庭での性別役割の押し付けが残ったため、社会の仕組みを変えて実質的な平等を求めた。',
    alternatives: [
      '女性参政権の獲得で政治的平等が進んでも、賃金差や家事育児の女性への偏りが残ったので、社会構造を変えて実質的平等を求めた。',
      '参政権獲得で政治的には同権となっても、雇用差別と家庭内の性別役割が残ったため、実質的平等を求めて女性解放運動が続いた。',
    ],
    clauses: [
      '女性参政権の獲得で政治的平等が進んだ。',
      '賃金格差が残った。',
      '家事育児の女性への偏りが残った。',
      '不平等が残ったので、社会を変えて実質的な平等を目指した。',
    ],
    contradictions: [
      '女性参政権の廃止で政治的平等が進んだ。',
      '雇用上の差別は解消した。',
      '家庭での性別役割は解消した。',
      '不平等が解消したため女性解放運動が続いた。',
    ],
    wrongActor: '男性の賃金格差が残った。家事育児の負担は完全に平等となった。',
    list: '女性、参政権、政治上の平等、賃金格差、家庭、性別役割、実質的平等、女性解放運動。',
  },
]

test('new curriculum profiles use stable unique ids and question-sized weighted elements', () => {
  assert.equal(NEW_CURRICULUM_ESSAY_PROFILES.length, 4)
  assert.equal(new Set(NEW_CURRICULUM_ESSAY_PROFILES.map(profile => profile.id)).size, 4)
  for (const profile of NEW_CURRICULUM_ESSAY_PROFILES) {
    validateEssayProfile(profile)
    const fixture = newCurriculumEssayCases.find(item => item.id === profile.id)!
    assert.equal(profile.version, 1)
    assert.equal(profile.max_characters, 80)
    assert.deepEqual(profile.elements.map(element => element.points), fixture.weights)
  }
})

for (const fixture of newCurriculumEssayCases) {
  const profile = NEW_CURRICULUM_ESSAY_PROFILES.find(item => item.id === fixture.id)!
  for (const [index, answer] of [fixture.model, ...fixture.alternatives].entries()) {
    test(`${fixture.id}: model/alternative ${index} confirms all elements in at most 80 characters`, () => {
      const result = gradeEssay(profile, answer)
      assert.equal(result.score, 8, JSON.stringify(result))
      assert.equal(result.elements.filter(element => element.status === 'matched').length, profile.elements.length)
    })
  }
  fixture.clauses.forEach((answer, index) => {
    test(`${fixture.id}: partial element ${index} earns its weight and leaves unknown elements pending`, () => {
      const result = gradeEssay(profile, answer)
      assert.equal(result.elements[index]!.status, 'matched', JSON.stringify(result))
      assert.equal(result.confirmed_points, fixture.clausePoints?.[index] ?? fixture.weights[index])
      assert.equal(result.score, null)
    })
  })
  fixture.contradictions.forEach((answer, index) => {
    test(`${fixture.id}: contradicted element ${index} cannot earn points`, () => {
      const result = gradeEssay(profile, answer)
      assert.equal(result.elements[index]!.status, 'contradicted', JSON.stringify(result))
      assert.equal(result.elements[index]!.awarded_points, 0)
    })
  })
  for (const [name, answer] of [['wrong actor', fixture.wrongActor], ['keyword list', fixture.list], ['unknown wording', 'この社会では複雑な事情があった。']] as const) {
    test(`${fixture.id}: ${name} does not silently confirm a substantive element`, () => {
      const result = gradeEssay(profile, answer)
      assert.equal(result.confirmed_points, 0, JSON.stringify(result))
      assert.equal(result.score, null)
    })
  }
  for (const [name, suffix] of [['global retraction', '以上の説明は誤りである。'], ['hypothesis', 'と仮定する。']] as const) {
    test(`${fixture.id}: ${name} holds otherwise matching claims`, () => {
      const result = gradeEssay(profile, fixture.model + suffix)
      assert.equal(result.confirmed_points, 0)
      assert.ok(result.elements.every(element => element.status === 'pending'))
    })
  }
  test(`${fixture.id}: negated positive assertion stays pending`, () => {
    const answer = fixture.clauses[0]!.replace('。', 'とは言えない。')
    assert.equal(gradeEssay(profile, answer).elements[0]!.status, 'pending')
  })
  test(`${fixture.id}: positive and contradictory assertions stay pending`, () => {
    const result = gradeEssay(profile, fixture.clauses[0]! + fixture.contradictions[0]!)
    assert.equal(result.elements[0]!.status, 'pending')
    assert.equal(result.elements[0]!.awarded_points, null)
  })
}

test('female liberation holds explicitly reversed subjects even with intervening particles or conflicting claims', () => {
  const profile = NEW_CURRICULUM_ESSAY_PROFILES.find(item => item.id === 'new-curriculum-07-g04-q03')!
  for (const answer of [
    '男性には賃金格差が残った。',
    '男性には賃金格差が残り、女性の雇用差別は解消した。',
    '男性には家事や育児の負担が女性に偏った。',
    '男性に対する雇用差別が残った。',
  ]) {
    const result = gradeEssay(profile, answer)
    assert.equal(result.confirmed_points, 0, JSON.stringify(result))
    assert.ok(result.elements.every(element => element.status === 'pending'))
  }
})

test('review regressions: six negated assertion prefixes cannot earn points', () => {
  const cases: [number, string][] = [
    [0, 'アッシリアは街道に宿駅を設け、交代で情報を運ばず、インカの情報網を眺めた。'],
    [0, 'アッシリアとインカ。両国とも遠隔地への情報伝達によって広域支配を支えず撤退した。'],
    [1, 'インドの綿織物業は衰退し、綿布の輸出地から輸入市場となり、綿花などの原料供給地へ組み込まれずに終わった。'],
    [2, '輸入工業品を国内生産に替えず工業品の輸入を増やした。'],
    [3, '賃金格差が残らず、すべて平等となった。'],
    [3, '家事育児の女性への偏りが残らず、男女は同じ負担となった。'],
  ]
  for (const [index, answer] of cases) {
    const result = gradeEssay(NEW_CURRICULUM_ESSAY_PROFILES[index]!, answer)
    assert.equal(result.confirmed_points, 0, JSON.stringify(result))
    assert.ok(result.elements.every(element => element.status === 'pending'))
  }
})

test('every registered positive terminal holds finite negative conjugations and unperformed claims', () => {
  // Review each distinct assertion ending, rather than testing only one model
  // per profile. The rule data stays finite; no regex is stored in the catalog.
  const endings: [string, string[]][] = [
    ['問題とし', ['問題とせず', '問題としなく', '問題とせぬ', '問題とすることはない', '問題とせずに']],
    ['組み込まれ', ['組み込まれず', '組み込まれなく', '組み込まれぬ', '組み込まれることはない', '組み込まれずに']],
    ['妨げられ', ['妨げられず', '妨げられなく', '妨げられぬ', '妨げられることはない', '妨げられずに']],
    ['阻害され', ['阻害されず', '阻害されなく', '阻害されぬ', '阻害されることはない', '阻害されずに']],
    ['支え', ['支えず', '支えなく', '支えぬ', '支えることはない', '支えずに']],
    ['役立', ['役立たず', '役立たなく', '役立たぬ', '役立つことはない', '役立たずに']],
    ['変わ', ['変わらず', '変わらなく', '変わらぬ', '変わることはない', '変わらずに']],
    ['替え', ['替えず', '替えなく', '替えぬ', '替えることはない', '替えずに']],
    ['換え', ['換えず', '換えなく', '換えぬ', '換えることはない', '換えずに']],
    ['進め', ['進めず', '進めなく', '進めぬ', '進めることはない', '進めずに']],
    ['妨げ', ['妨げず', '妨げなく', '妨げぬ', '妨げることはない', '妨げずに']],
    ['生じ', ['生じず', '生じなく', '生じぬ', '生じることはない', '生じずに']],
    ['捉え', ['捉えず', '捉えなく', '捉えぬ', '捉えることはない', '捉えずに']],
    ['考え', ['考えず', '考えなく', '考えぬ', '考えることはない', '考えずに']],
    ['進ん', ['進まず', '進まなく', '進まぬ', '進むことはない', '進まずに']],
    ['求め', ['求めず', '求めなく', '求めぬ', '求めることはない', '求めずに']],
    ['目指', ['目指さず', '目指さなく', '目指さぬ', '目指すことはない', '目指さずに']],
    ['とな', ['とならず', 'とならなく', 'とならぬ', 'となることはない', 'とならずに']],
    ['にな', ['にならず', 'にならなく', 'にならぬ', 'になることはない', 'にならずに']],
    ['運', ['運ばず', '運ばなく', '運ばぬ', '運ぶことはない', '運ばずに']],
    ['伝', ['伝えず', '伝えなく', '伝えぬ', '伝えることはない', '伝えずに']],
    ['残', ['残らず', '残らなく', '残らぬ', '残ることはない', '残らずに']],
    ['続', ['続かず', '続かなく', '続かぬ', '続くことはない', '続かずに']],
    ['偏', ['偏らず', '偏らなく', '偏らぬ', '偏ることはない', '偏らずに']],
    ...['中継', '統治', '流入', '輸出', '生産', '育成', '説明', '実現', '集中'].map(verb => [
      verb, [`${verb}せず`, `${verb}しなく`, `${verb}せぬ`, `${verb}することはない`, `${verb}せずに`],
    ] as [string, string[]]),
  ]
  let checked = 0
  for (const profile of NEW_CURRICULUM_ESSAY_PROFILES) {
    for (const element of profile.elements) {
      for (const pattern of element.positive) {
        const prefix = pattern.sequence.slice(0, -1).map(group => group[0]!).join('')
        for (const terminal of pattern.sequence.at(-1)!) {
          const ending = endings.find(([stem]) => terminal.endsWith(stem))
          assert.ok(ending, `Add finite conjugation cases for ${terminal}`)
          for (const replacement of ending[1]) {
            const answer = prefix + terminal.slice(0, -ending[0].length) + replacement + '。'
            const result = gradeEssay(profile, answer)
            assert.equal(result.elements.find(item => item.id === element.id)!.status, 'pending', answer)
            assert.equal(result.confirmed_points, 0, answer + JSON.stringify(result.elements))
            checked++
          }
          const unperformed = gradeEssay(profile, prefix + terminal + 'は未実施だった。')
          assert.equal(unperformed.confirmed_points, 0, terminal)
          assert.ok(unperformed.elements.every(item => item.status === 'pending'))
          checked++
        }
      }
    }
  }
  assert.ok(checked >= 300, `Only ${checked} terminal variants checked`)
})
