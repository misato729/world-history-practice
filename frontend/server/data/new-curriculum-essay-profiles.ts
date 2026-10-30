import type { EssayPattern, EssayScoringProfile } from '../../shared/types/essay.ts'

// Each alternative is a bounded assertion, not an unordered list of keywords.
// Keep the actor attached to the action. New wording is held for review.
const phrase = (...alternatives: string[]): EssayPattern => ({ sequence: [alternatives], max_gap: 0 })
const joined = (...sequence: string[][]): EssayPattern => ({ sequence, max_gap: 0 })
// The engine deliberately does not parse Japanese conjugation. Hold the finite
// negative endings of this catalog's assertion stems, including 「ず」「なく」.
// A caution holds the entire answer because the negation's scope is unresolved.
const negated = (...stems: string[]): EssayPattern[] => stems.map(stem => phrase(
  `${stem}ず`, `${stem}なく`, `${stem}ぬ`, `${stem}ない`, `${stem}ません`,
))
const unperformed = phrase('未実施', '実施に至ら', '実現に至ら', 'することなく', 'とは言えず', 'とはいえず')

export const NEW_CURRICULUM_ESSAY_PROFILES: EssayScoringProfile[] = [
  {
    id: 'new-curriculum-06-g01-q03', version: 1,
    title: 'アッシリア・インカの駅伝制', max_characters: 80,
    required_terms: ['アッシリア', 'インカ'],
    caution_patterns: [
      ...negated('運ば', '伝え', '中継し', '中継せ', '支え', '役立た', '統治し', '統治せ'),
      unperformed,
    ],
    elements: [
      {
        id: 'assyrian-relay', label: 'アッシリア：街道・宿駅と交代による情報伝達', points: 3,
        positive: [joined(['アッシリア'], ['は', 'では', '王国は', '王国では'], [
          '街道に宿駅を設け、交代で情報を運', '街道に宿駅を置いて交代で情報を伝',
          '街道の宿駅で交代して情報を中継', '道路沿いに宿駅を設けて交替で連絡を中継',
          '街道の宿駅を利用し、交代で情報を伝',
        ])],
        negative: [joined(['アッシリア'], ['は', 'では', '王国は', '王国では'], [
          '宿駅を廃止して情報を運', '街道や宿駅を用いずに情報を伝',
        ])],
      },
      {
        id: 'inca-relay', label: 'インカ：道路網を飛脚が走り命令・情報を中継', points: 3,
        positive: [joined(['インカ'], ['は', 'では', '帝国は', '帝国では'], [
          '道路網を飛脚が走って命令を中継', '道路網を飛脚が走って情報を中継',
          '道路を飛脚が走り、命令を伝', '道路網の飛脚が交代して情報を伝',
          '道路網を使い、飛脚が命令を中継', '道路網の飛脚によって情報を中継',
        ])],
        negative: [joined(['インカ'], ['は', 'では', '帝国は', '帝国では'], [
          '鉄道で命令を伝', '電信で情報を中継', '馬車で命令を中継',
        ])],
      },
      {
        id: 'communication-rule', label: '遠隔地との情報連絡が広域支配を支えた関係', points: 2,
        positive: [phrase(
          '遠隔地との連絡を保つ両者の仕組みは、広域支配を支え',
          '両国とも遠隔地への情報伝達によって広域支配を支え',
          'いずれも遠方との連絡網が広い領土の統治を支え',
          '遠隔地へ命令を伝える両国の仕組みは広域統治に役立',
          '双方とも遠隔地との情報連絡を通じて広大な領域を統治',
        )],
        negative: [phrase('両国の情報伝達網が広域支配を妨げ', '遠隔地との連絡を断つことで広域支配を支え')],
      },
    ],
  },
  {
    id: 'new-curriculum-06-g03-q07', version: 1,
    title: 'インド・イギリスの輸出入の逆転', max_characters: 80, required_terms: [],
    caution_patterns: [
      ...negated('流入し', '流入せ', '輸出し', '輸出せ', '輸出され', 'なら', '変わら', '組み込まれ'),
      unperformed,
    ],
    elements: [
      {
        id: 'british-mechanization', label: 'イギリスの産業革命・機械製綿製品のインド流入', points: 3,
        positive: [phrase(
          'イギリスの産業革命で機械製綿布がインドへ流入',
          '英国の産業革命で機械製綿布がインドに流入',
          'イギリスの機械制綿工業が発達して綿布がインドへ輸出',
          '英国の綿工業の機械化で安い綿製品がインドに流入',
          '産業革命を経たイギリスの機械製綿布がインドに輸出',
        )],
        negative: [phrase('インドの産業革命で機械製綿布がイギリスへ流入', 'イギリスの産業革命でインドの綿布輸出が増加')],
      },
      {
        id: 'indian-industry-market', label: 'インドの綿織物業の衰退と綿製品の輸入市場化', points: 3,
        positive: [joined(['インドの綿織物業は衰退し、', 'インドの綿工業が衰退し、', 'インドでは綿織物業が衰え、'], [
          '綿布の輸出地から輸入市場とな', '綿製品の輸出地から輸入市場に変わ',
          '綿布を輸入する市場とな', 'イギリス製綿布の輸入市場とな',
        ])],
        negative: [phrase('インドの綿織物業は発展し、綿布の輸出地とな', 'インドは綿布の輸入地から輸出地に変わ')],
      },
      {
        id: 'indian-raw-materials', label: 'インドが綿花等の原料供給地へ変わったこと', points: 2,
        positive: [phrase(
          'インドが綿花などの原料供給地とな', 'インドは綿花の原料供給地とな',
          'インドは綿花など原料を供給する地域とな', 'インドが綿花の供給地に変わ',
          'インドの綿織物業は衰退し、綿布の輸出地から輸入市場となり、綿花などの原料供給地へ組み込まれ',
          'インドでは綿織物業が衰え、綿布を輸入する市場となり、綿花の供給地に変わ',
          'インドの綿工業が衰退し、イギリス製綿布の輸入市場となり、綿花の供給地とな',
        )],
        negative: [phrase('イギリスはインドへの綿花の原料供給地とな', 'インドは綿花の供給地から輸入地に変わ')],
      },
    ],
  },
  {
    id: 'new-curriculum-07-g02-q06', version: 1,
    title: '輸入代替工業化と従属理論', max_characters: 80, required_terms: [],
    caution_patterns: [
      ...negated('替え', '置き換え', '生産し', '生産せ', '目指さ', '進め', '育成し', '育成せ',
        '妨げ', '妨げられ', '阻害され', '生じ', '捉え', '考え', '説明し', '説明せ', '問題とし', '問題とせ'),
      unperformed,
    ],
    elements: [
      {
        id: 'domestic-production', label: '輸入工業品を国内生産で代替する政策', points: 2,
        positive: [joined(['輸入工業品を', '輸入していた工業品を', '輸入品を'], [
          '国内生産に替え', '国内で生産', '自国で生産', '国産品に置き換え',
        ]), phrase('輸入代替工業化は工業品の国産化を目指', '輸入代替工業化では輸入工業品の国産化を進め')],
        negative: [phrase('輸入代替工業化は工業品の輸入拡大を目指', '国内生産を輸入工業品に替え')],
      },
      {
        id: 'industrialization-goal', label: 'その政策によって自国の工業化を進める目的', points: 2,
        positive: [joined(['輸入工業品を国内生産に替えて', '輸入していた工業品を国内で生産して', '輸入品を自国で生産して'], [
          '工業化を進め', '自国の工業化を目指', '国内工業を育成',
        ]), phrase('輸入代替工業化は自国の工業化を目指', '輸入代替工業化によって国内工業を育成')],
        negative: [phrase('輸入代替工業化は国内工業の縮小を目指', '輸入品を自国で生産して工業化を妨げ')],
      },
      {
        id: 'dependent-division', label: '先進国に従属する途上国の国際分業上の関係', points: 2,
        positive: [joined(['従属理論は、', '従属理論では、', '従属理論は', '従属理論では'], [
          '先進国に従属する国際分業が途上国の', '先進国への従属的な国際分業が開発途上国の',
          '途上国が先進国に従属する国際分業によって', '先進国に従属した国際分業によって途上国の',
        ], ['発展を妨げ', '発展が妨げられ', '発展が阻害され', '発展の遅れが生じ']), phrase(
          '従属理論は、途上国が先進国に従属する国際分業を捉え',
          '従属理論では途上国の先進国への従属関係を捉え',
          '従属理論は先進国と途上国の従属的な国際分業を問題とし',
        )],
        negative: [phrase('従属理論は先進国が途上国に従属する国際分業と捉え', '従属理論は、途上国に従属する先進国の発展が妨げられ')],
      },
      {
        id: 'underdevelopment-cause', label: 'その従属関係が途上国の発展を妨げるという説明', points: 2,
        positive: [joined(['従属理論は、', '従属理論では、', '従属理論は', '従属理論では'], [
          '先進国に従属する国際分業が途上国の発展を妨げると捉え',
          '先進国への従属的な国際分業が開発途上国の発展を妨げると考え',
          '途上国が先進国に従属する国際分業によって発展が阻害されると説明',
          '先進国に従属した国際分業によって途上国の発展の遅れが生じると考え',
        ])],
        negative: [phrase('先進国に従属する国際分業が途上国の発展を促すと捉え', '途上国の発展の遅れが先進国への従属を生むと説明')],
      },
    ],
  },
  {
    id: 'new-curriculum-07-g04-q03', version: 1,
    title: '政治上の平等と女性解放運動', max_characters: 80, required_terms: [],
    caution_patterns: [
      ...negated('進ま', 'なら', '実現し', '実現せ', '残ら', '続か', '偏ら', '集中し', '集中せ', '求め', '目指さ'),
      unperformed,
      phrase(
      '男性の賃金', '男性は賃金', '男性には賃金', '男性に賃金',
      '男性への雇用差別', '男性には雇用', '男性に対する雇用差別',
      '男性への家事育児', '男性に家事育児', '男性には家事', '男性は家事',
      ),
    ],
    elements: [
      {
        id: 'political-equality', label: '女性参政権獲得により政治上の平等が進んだこと', points: 2,
        positive: [phrase(
          '参政権など政治上の平等が進ん', '女性参政権の獲得で政治的平等が進ん',
          '参政権を獲得して政治上は平等にな', '女性が参政権を得て政治上の平等が実現',
          '参政権獲得で政治的には同権とな',
        )],
        negative: [phrase('参政権を獲得しても政治上の平等は後退', '女性参政権の廃止で政治的平等が進ん')],
      },
      {
        id: 'employment-inequality', label: '賃金・雇用上の差別が残っていたこと', points: 2,
        positive: [phrase(
          '賃金格差や家庭での性別役割の押し付けが残', '賃金差や家事育児の女性への偏りが残',
          '雇用差別と家庭内の性別役割が残', '賃金格差が残', '雇用上の差別が残',
          '職場での差別が続', '男女の賃金差が残', '就職や昇進での差別が残',
        )],
        negative: [phrase('雇用上の差別は解消した', '男女の賃金格差が完全になくなった', '賃金格差は解消した')],
      },
      {
        id: 'household-inequality', label: '家庭における性別役割・家事育児負担の偏りが残ったこと', points: 2,
        positive: [phrase(
          '家庭での性別役割の押し付けが残', '家事育児の女性への偏りが残',
          '家庭内の性別役割が残', '家事や育児の負担が女性に偏',
          '家庭で女性に家事育児を押し付ける役割分担が残',
          '家庭では女性に家事育児が集中',
        )],
        negative: [phrase('家庭での性別役割は解消した', '家事育児の女性への偏りは解消した', '家事育児の負担は完全に平等となった')],
      },
      {
        id: 'continued-movement', label: '残る不平等を理由に社会を変え実質的平等を求めた因果', points: 2,
        positive: [joined([
          '賃金格差や家庭での性別役割の押し付けが残ったため、',
          '賃金差や家事育児の女性への偏りが残ったので、',
          '雇用差別と家庭内の性別役割が残ったため、',
          '差別が残ったため、', '不平等が残ったので、',
        ], [
          '社会の仕組みを変えて実質的な平等を求め', '社会構造を変えて実質的平等を求め',
          '社会を変えて実質的な平等を目指', '実質的平等を求めて女性解放運動が続',
        ])],
        negative: [phrase('不平等が解消したため女性解放運動が続', '雇用と家庭の問題は解決したため女性解放運動が続')],
      },
    ],
  },
]
