import type { EssayPattern, EssayRuleElement, EssayScoringProfile } from '../../shared/types/essay.ts'

const first = ['第1次', '第一次']
const second = ['第2次', '第二次']
const firstPeriod = ['15世紀末']
const firstEnd = ['17世紀半ば', '17世紀中頃', '17世紀中ごろ']
const secondPeriod = ['18〜19世紀', '18~19世紀', '18から19世紀', '18世紀から19世紀']
const pattern = (sequence: string[][], max_gap = 40): EssayPattern => ({ sequence, max_gap, scope: 'sentence' })

/** Keep every old profile intact; only questions explicitly saved as v2 use these weights. */
export function buildWeightedEssayProfileRevisions(legacyProfiles: EssayScoringProfile[]): EssayScoringProfile[] {
  const legacy = (id: string) => {
    const profile = legacyProfiles.find(item => item.id === id && item.version === 1)
    if (!profile) throw new TypeError(`Missing legacy essay profile: ${id}`)
    return structuredClone(profile)
  }
  const enclosure = legacy('mock-01-g02-q07')
  const industry = legacy('mock-02-g01-q08')
  const hygiene = legacy('mock-03-g01-q08')
  const negatives = (profile: EssayScoringProfile, ids: string[]) => profile.elements.filter(item => ids.includes(item.id)).flatMap(item => item.negative ?? [])
  const element = (id: string, label: string, positive: EssayPattern[], negative: EssayPattern[]): EssayRuleElement => ({ id, label, points: 2, positive, negative })
  // A sentence mentioning both periods may switch subjects between matching terms.
  // We cannot reliably attribute such comparisons with this finite matcher.
  const mixedSubjects = [pattern([first, second], 140), pattern([second, first], 140)]
  return [
    {
      ...enclosure,
      version: 2,
      caution_patterns: [...(enclosure.caution_patterns ?? []), ...mixedSubjects],
      elements: [
        element('e1', '第1次の時期（15世紀末〜17世紀半ば）と、毛織物市場拡大に伴う牧羊地化の目的を示す。', [
          pattern([first, firstPeriod, firstEnd, ['毛織物市場の拡大を背景に', '毛織物の市場拡大を背景に', '毛織物市場が拡大したため'], ['牧羊地に転換した', '牧羊地に変えた', '牧羊地化を進めた']]),
          pattern([first, ['毛織物市場の拡大を背景に', '毛織物の市場拡大を背景に'], firstPeriod, firstEnd, ['牧羊地に転換した', '牧羊地に変えた', '牧羊地化を進めた']]),
        ], negatives(enclosure, ['e1', 'e2'])),
        element('e2', '第2次の時期（18〜19世紀）と、人口増加・穀物不足への対応として穀物増産を進めたことを示す。', [
          pattern([second, secondPeriod, ['人口増加と穀物不足に対応して', '人口増加と穀物不足から', '人口増加と穀物不足への対応として'], ['穀物増産を進めた', '穀物の増産を進めた', '穀物を増産した']], 50),
          pattern([second, ['人口増加と穀物不足に対応して', '人口増加と穀物不足から'], secondPeriod, ['穀物増産を進めた', '穀物の増産を進めた', '穀物を増産した']], 50),
        ], negatives(enclosure, ['e3', 'e4'])),
        element('e3', enclosure.elements.find(item => item.id === 'e5')!.label, [
          pattern([second, ['議会の承認のもと', '議会の許可を得て', '議会の承認を得て'], ['進めた', '進められた', '増産した']], 50),
        ], negatives(enclosure, ['e5'])),
        { ...enclosure.elements.find(item => item.id === 'e7')!, id: 'e4', points: 2, negative: negatives(enclosure, ['e6', 'e7']) },
      ],
    },
    {
      ...industry,
      version: 2,
      caution_patterns: [...(industry.caution_patterns ?? []), ...mixedSubjects],
      elements: [
        { ...industry.elements.find(item => item.id === 'e1')!, points: 2 },
        element('e2', '第1次は石炭を燃料とする蒸気機関を動力とし、綿工業を中心に進んだことを示す。', [
          pattern([first, ['石炭を燃料とする', '石炭による'], ['蒸気機関の利用が広がり', '蒸気機関を動力に', '蒸気機関を動力として', '蒸気機関を利用し', '蒸気機関を使用し'], ['綿工業を中心に', '綿工業を中心として', '綿工業を主軸として'], ['進んだ', '展開した']], 48),
          pattern([first, ['綿工業を中心に', '綿工業を中心として'], ['石炭を燃料とする', '石炭による'], ['蒸気機関を動力に', '蒸気機関を利用して'], ['進んだ', '展開した']], 48),
        ], negatives(industry, ['e2', 'e3'])),
        { ...industry.elements.find(item => item.id === 'e4')!, id: 'e3', points: 2 },
        element('e4', '第2次は電力・石油を新動力源とし、重化学工業を中心に進んだことを示す。', [
          pattern([second, ['電力・石油を', '電力と石油を', '石油・電力を', '石油と電力を'], ['新動力源として', '動力源とする', '動力源として', 'エネルギー源として'], ['重化学工業を中心に', '重化学工業を中心として', '重化学工業を主軸として'], ['進んだ', '展開した']], 42),
          pattern([second, ['重化学工業を中心に', '重化学工業を中心として'], ['電力・石油を', '電力と石油を', '石油・電力を', '石油と電力を'], ['新動力源として', '動力源として', 'エネルギー源として'], ['進んだ', '展開した']], 42),
        ], negatives(industry, ['e5', 'e6'])),
      ],
    },
    {
      ...hygiene,
      version: 2,
      elements: hygiene.elements.map(item => item.id !== 'e1' ? item : {
        ...item,
        positive: [
          pattern([['産業革命'], ['都市'], ['住宅', '住居', '住環境'], ['生活環境'], ['悪化し', '悪化した', '劣悪化し', '劣悪化した']], 30),
          pattern([['産業革命'], ['都市'], ['生活環境'], ['住宅', '住居', '住環境'], ['悪化し', '悪化した', '劣悪化し', '劣悪化した']], 30),
        ],
      }),
    },
  ]
}
