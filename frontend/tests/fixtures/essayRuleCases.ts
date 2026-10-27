export type EssayRuleCase = { profile_id: string; name: string; answer: string; expected_confirmed_points?: number; expected_score?: number | null; expected_grading_status?: string; must_match?: string[]; must_not_match?: string[]; must_pending?: string[]; expect_unsettled?: boolean }

export const essayModelAnswers: Record<string, string> = {
  "mock-01-g02-q07": "第1次は15世紀末から17世紀半ば、毛織物市場の拡大を背景に、共有地などを牧羊地に転換した。第2次は18〜19世紀、人口増加と穀物不足に対応して、議会の承認のもと穀物増産を進めた。土地を失った農民の多くは都市へ移り、工場労働者となって産業革命を支えた。",
  "mock-01-g03-q08": "ロゼッタ=ストーンはナポレオンのエジプト遠征隊が発見し、敗北後にイギリスへ渡った。円明園はアロー戦争末期に英仏軍が略奪・破壊し、軍事行動は文化財の移動と喪失をもたらした。",
  "mock-02-g01-q08": "第1次は18世紀後半のイギリスで、石炭を燃料とする蒸気機関の利用が広がり、綿工業を中心に進んだ。第2次は1870年代から、電力・石油を新動力源として、重化学工業を中心に進んだ。",
  "mock-02-g03-q08": "アンリ4世は1598年のナントの王令でユグノーに条件付きの信仰の自由を認めた。ルイ14世が1685年に王令を廃止すると、多数がイギリスやオランダへ亡命し、フランスの産業・経済が停滞する一因となった。",
  "mock-03-g01-q08": "産業革命期の都市では住宅や生活環境が悪化し、汚染された水を通じてコレラが流行した。細菌学や予防医学の知見と結び付いた公衆衛生の考えから上下水道やごみ収集などが整えられ、幼児死亡率の低下と平均寿命の伸長につながった。",
  "mock-03-g03-q08": "航海法はイギリス貿易を保護するため、欧州産品の輸入船を原則として英国船か産出国側の船に限り、オランダ船の排除をねらった。これに対抗して第1次英蘭戦争が起こり、一連の戦争で優勢となったイギリスが、衰退したオランダに代わり制海権を握った。",
  "mock-04-g01-q07": "第一次世界大戦中、従来男性が担った社会領域へ女性が進出し、戦時協力を背景に参政権が拡大した。イギリスの1918年の年齢条件は男性21歳以上・女性30歳以上で、1928年には男女とも21歳以上となった。アメリカでも戦時協力を経て1920年に女性参政権が実現した。",
  "mock-04-g03-q07": "ロンドンでは鉄とガラスの水晶宮が工業力を示し、トマス=クックの団体旅行は旅行が大衆の娯楽となる契機になった。パリでは電気館や動く歩道が第2次産業革命の成果を示し、パリ=オリンピックも同時に開かれた。",
  "mock-05-g01-q08": "国際連盟総会は原則全会一致だったが、国連総会は多数決となった。国連では安全保障理事会の権限を強め、経済・外交・軍事的制裁で加盟国を法的に拘束する決定を可能にした。一方、常任理事国には拒否権があり、重要事項の決定を制約し、冷戦期には多用された。",
  "mock-05-g03-q08": "支配地の拡大をめざす封建領主は、未開地に修道院を招いて開墾を進めた。1098年にフランスで創設されたシトー修道会は清貧と労働を重んじ、12世紀以降、大開墾運動の中心となった。",
  "mock-06-g01-q08": "インカ帝国はアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。モンゴル帝国・元朝のジャムチは、駅ごとに交通手段や宿泊を提供し、旅行者・物資・情報を運んだ。元では近隣住民から選ばれた站戸が、牌符を持つ使節・軍人・官吏に食料や馬を提供した。",
  "mock-06-g03-q08": "マルサスは1798年刊の『人口論』で、食料は算術級数的、人口は幾何級数的に増えるとし、人口増加が食料の増加を上回るため貧困化は避けられないと説いた。その解決策として人口の抑制を主張した。"
}

export const essayRuleCases: EssayRuleCase[] = [
  {
    "profile_id": "mock-01-g02-q07",
    "name": "模範解答",
    "answer": "第1次は15世紀末から17世紀半ば、毛織物市場の拡大を背景に、共有地などを牧羊地に転換した。第2次は18〜19世紀、人口増加と穀物不足に対応して、議会の承認のもと穀物増産を進めた。土地を失った農民の多くは都市へ移り、工場労働者となって産業革命を支えた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "許容する言い換え",
    "answer": "第一次は15世紀末から17世紀中頃、毛織物の市場拡大を背景に土地を牧羊地に変えた。第二次は18世紀から19世紀、人口増加と穀物不足から議会の許可を得て穀物の増産を進めた。土地を失った農民は都市に流入し工場労働者となり産業革命を担った。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "全角数字と空白改行",
    "answer": "第１次は１５世紀末から１７世紀半ば、毛織物市場の拡大を背景に、共有地などを牧羊地に転換した。\n 第２次は１８〜１９世紀、人口増加と穀物不足に対応して、議会の承認のもと穀物増産を進めた。\n 土地を失った農民の多くは都市へ移り、工場労働者となって産業革命を支えた。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "語句の途中で改行",
    "answer": "第1次は15世紀\n末から17世紀半\nば、毛織物市場の\n拡大を背景に、共\n有地などを牧羊地\nに転換した。第2\n次は18〜19世\n紀、人口増加と穀\n物不足に対応して\n、議会の承認のも\nと穀物増産を進め\nた。土地を失った\n農民の多くは都市\nへ移り、工場労働\n者となって産業革\n命を支えた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "疑問符付き答案",
    "answer": "第1次は15世紀末から17世紀半ば、毛織物市場の拡大を背景に、共有地などを牧羊地に転換した。第2次は18〜19世紀、人口増加と穀物不足に対応して、議会の承認のもと穀物増産を進めた。土地を失った農民の多くは都市へ移り、工場労働者となって産業革命を支えた。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6",
      "e7"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "部分解答",
    "answer": "第1次は15世紀末から17世紀半ばに進んだ。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "主体又は年代の逆転",
    "answer": "第1次は18〜19世紀に進んだ。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "否定",
    "answer": "第1次は15世紀末から17世紀半ばには進まなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "語句の列挙",
    "answer": "第1次、15世紀末、17世紀半ば、毛織物、牧羊、第2次、18〜19世紀、議会、穀物、工場労働者。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6",
      "e7"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6",
      "e7"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "誤帰属",
    "answer": "第1次は15世紀末から17世紀半ばだという説明は別人の説である。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "正誤併記",
    "answer": "第1次は15世紀末から17世紀半ばに進んだ。第1次は18〜19世紀に進んだ。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "仮定の中の正答",
    "answer": "仮に第1次は15世紀末から17世紀半ばに進んだ。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "模範解答",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征隊が発見し、敗北後にイギリスへ渡った。円明園はアロー戦争末期に英仏軍が略奪・破壊し、軍事行動は文化財の移動と喪失をもたらした。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "許容する言い換え",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征で発見され、敗戦後に英国へ移った。円明園は第2次アヘン戦争で英仏軍に略奪・破壊された。戦争は文化財の移動と喪失を招いた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "全角数字と空白改行",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征隊が発見し、敗北後にイギリスへ渡った。\n 円明園はアロー戦争末期に英仏軍が略奪・破壊し、軍事行動は文化財の移動と喪失をもたらした。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "語句の途中で改行",
    "answer": "ロゼッタ=ストー\nンはナポレオンの\nエジプト遠征隊が\n発見し、敗北後に\nイギリスへ渡った\n。円明園はアロー\n戦争末期に英仏軍\nが略奪・破壊し、\n軍事行動は文化財\nの移動と喪失をも\nたらした。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "疑問符付き答案",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征隊が発見し、敗北後にイギリスへ渡った。円明園はアロー戦争末期に英仏軍が略奪・破壊し、軍事行動は文化財の移動と喪失をもたらした。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "部分解答",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征で発見された。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "主体又は年代の逆転",
    "answer": "ロゼッタ=ストーンはルイ14世がエジプト遠征で発見した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "否定",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征で発見されなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "語句の列挙",
    "answer": "ロゼッタ、ナポレオン、エジプト遠征、イギリス、円明園、アロー戦争、英仏軍、略奪、破壊、文化財、移動、喪失。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "誤帰属",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征で発見されたという説は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "正誤併記",
    "answer": "ロゼッタ=ストーンはナポレオンのエジプト遠征で発見された。ロゼッタ=ストーンはルイ14世がエジプト遠征で発見した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "仮定の中の正答",
    "answer": "仮にロゼッタ=ストーンはナポレオンのエジプト遠征で発見された。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "模範解答",
    "answer": "第1次は18世紀後半のイギリスで、石炭を燃料とする蒸気機関の利用が広がり、綿工業を中心に進んだ。第2次は1870年代から、電力・石油を新動力源として、重化学工業を中心に進んだ。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "許容する言い換え",
    "answer": "第一次は18世紀後半に英国で、石炭による蒸気機関を動力に綿工業を中心として進んだ。第二次は1870年代に始まり、電力と石油を動力源とする重化学工業を中心に展開した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "全角数字と空白改行",
    "answer": "第１次は１８世紀後半のイギリスで、石炭を燃料とする蒸気機関の利用が広がり、綿工業を中心に進んだ。\n 第２次は１８７０年代から、電力・石油を新動力源として、重化学工業を中心に進んだ。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "語句の途中で改行",
    "answer": "第1次は18世紀\n後半のイギリスで\n、石炭を燃料とす\nる蒸気機関の利用\nが広がり、綿工業\nを中心に進んだ。\n第2次は1870\n年代から、電力・\n石油を新動力源と\nして、重化学工業\nを中心に進んだ。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "疑問符付き答案",
    "answer": "第1次は18世紀後半のイギリスで、石炭を燃料とする蒸気機関の利用が広がり、綿工業を中心に進んだ。第2次は1870年代から、電力・石油を新動力源として、重化学工業を中心に進んだ。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "部分解答",
    "answer": "第1次は18世紀後半のイギリスで始まった。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "主体又は年代の逆転",
    "answer": "第1次は19世紀後半のイギリスで始まった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "否定",
    "answer": "第1次は18世紀後半のイギリスで始まらなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "語句の列挙",
    "answer": "第1次、18世紀後半、イギリス、石炭、蒸気機関、綿工業、第2次、1870年代、電力、石油、重化学工業。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "誤帰属",
    "answer": "第1次は18世紀後半のイギリスで始まったという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "正誤併記",
    "answer": "第1次は18世紀後半のイギリスで始まった。第1次は19世紀後半のイギリスで始まった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "仮定の中の正答",
    "answer": "仮に第1次は18世紀後半のイギリスで始まった。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "模範解答",
    "answer": "アンリ4世は1598年のナントの王令でユグノーに条件付きの信仰の自由を認めた。ルイ14世が1685年に王令を廃止すると、多数がイギリスやオランダへ亡命し、フランスの産業・経済が停滞する一因となった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "許容する言い換え",
    "answer": "アンリ4世が1598年にナントの王令を発布し、ユグノーに条件付きで信仰の自由を保障した。ルイ14世は1685年に王令を撤回した。イギリス・オランダへの亡命がフランスの産業・経済の停滞を招いた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "全角数字と空白改行",
    "answer": "アンリ４世は１５９８年のナントの王令でユグノーに条件付きの信仰の自由を認めた。\n ルイ１４世が１６８５年に王令を廃止すると、多数がイギリスやオランダへ亡命し、フランスの産業・経済が停滞する一因となった。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "語句の途中で改行",
    "answer": "アンリ4世は15\n98年のナントの\n王令でユグノーに\n条件付きの信仰の\n自由を認めた。ル\nイ14世が168\n5年に王令を廃止\nすると、多数がイ\nギリスやオランダ\nへ亡命し、フラン\nスの産業・経済が\n停滞する一因とな\nった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "疑問符付き答案",
    "answer": "アンリ4世は1598年のナントの王令でユグノーに条件付きの信仰の自由を認めた。ルイ14世が1685年に王令を廃止すると、多数がイギリスやオランダへ亡命し、フランスの産業・経済が停滞する一因となった。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "部分解答",
    "answer": "アンリ4世は1598年にナントの王令を発布した。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "主体又は年代の逆転",
    "answer": "ルイ14世は1598年にナントの王令を発布した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "否定",
    "answer": "アンリ4世は1598年にナントの王令を発布しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "語句の列挙",
    "answer": "アンリ4世、1598年、ナントの王令、ユグノー、条件付き、信仰の自由、ルイ14世、1685年、廃止、亡命、産業、停滞。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "誤帰属",
    "answer": "アンリ4世は1598年にナントの王令を発布したという説は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "正誤併記",
    "answer": "アンリ4世は1598年にナントの王令を発布した。ルイ14世は1598年にナントの王令を発布した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "仮定の中の正答",
    "answer": "仮にアンリ4世は1598年にナントの王令を発布した。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "模範解答",
    "answer": "産業革命期の都市では住宅や生活環境が悪化し、汚染された水を通じてコレラが流行した。細菌学や予防医学の知見と結び付いた公衆衛生の考えから上下水道やごみ収集などが整えられ、幼児死亡率の低下と平均寿命の伸長につながった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "許容する言い換え",
    "answer": "産業革命期の都市は住宅と生活環境が悪化し、汚れた水でコレラが広まった。細菌学・予防医学に基づく公衆衛生により上下水道とごみ収集が整備され、幼児死亡率は低下し平均寿命が延長した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "全角数字と空白改行",
    "answer": "産業革命期の都市では住宅や生活環境が悪化し、汚染された水を通じてコレラが流行した。\n 細菌学や予防医学の知見と結び付いた公衆衛生の考えから上下水道やごみ収集などが整えられ、幼児死亡率の低下と平均寿命の伸長につながった。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "語句の途中で改行",
    "answer": "産業革命期の都市\nでは住宅や生活環\n境が悪化し、汚染\nされた水を通じて\nコレラが流行した\n。細菌学や予防医\n学の知見と結び付\nいた公衆衛生の考\nえから上下水道や\nごみ収集などが整\nえられ、幼児死亡\n率の低下と平均寿\n命の伸長につなが\nった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "疑問符付き答案",
    "answer": "産業革命期の都市では住宅や生活環境が悪化し、汚染された水を通じてコレラが流行した。細菌学や予防医学の知見と結び付いた公衆衛生の考えから上下水道やごみ収集などが整えられ、幼児死亡率の低下と平均寿命の伸長につながった。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "部分解答",
    "answer": "産業革命期の都市では住宅と生活環境が悪化した。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "主体又は年代の逆転",
    "answer": "産業革命期の都市では住宅と生活環境が改善した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "否定",
    "answer": "産業革命期の都市では住宅と生活環境が悪化しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "語句の列挙",
    "answer": "産業革命、都市、住宅、生活環境、汚染された水、コレラ、細菌学、予防医学、公衆衛生、上下水道、ごみ収集、幼児死亡率、平均寿命。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "誤帰属",
    "answer": "産業革命期の都市では住宅と生活環境が悪化したという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "正誤併記",
    "answer": "産業革命期の都市では住宅と生活環境が悪化した。産業革命期の都市では住宅と生活環境が改善した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "仮定の中の正答",
    "answer": "仮に産業革命期の都市では住宅と生活環境が悪化した。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "模範解答",
    "answer": "航海法はイギリス貿易を保護するため、欧州産品の輸入船を原則として英国船か産出国側の船に限り、オランダ船の排除をねらった。これに対抗して第1次英蘭戦争が起こり、一連の戦争で優勢となったイギリスが、衰退したオランダに代わり制海権を握った。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "許容する言い換え",
    "answer": "航海法は英国貿易の保護を目的とし、ヨーロッパ産品の輸入船を原則として英国船か産出国の船に限り、オランダ船排除を図った。対抗して第1次英蘭戦争が起き、一連の戦争で優位のイギリスが衰えたオランダに代わり制海権を獲得した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "全角数字と空白改行",
    "answer": "航海法はイギリス貿易を保護するため、欧州産品の輸入船を原則として英国船か産出国側の船に限り、オランダ船の排除をねらった。\n これに対抗して第１次英蘭戦争が起こり、一連の戦争で優勢となったイギリスが、衰退したオランダに代わり制海権を握った。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "語句の途中で改行",
    "answer": "航海法はイギリス\n貿易を保護するた\nめ、欧州産品の輸\n入船を原則として\n英国船か産出国側\nの船に限り、オラ\nンダ船の排除をね\nらった。これに対\n抗して第1次英蘭\n戦争が起こり、一\n連の戦争で優勢と\nなったイギリスが\n、衰退したオラン\nダに代わり制海権\nを握った。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "疑問符付き答案",
    "answer": "航海法はイギリス貿易を保護するため、欧州産品の輸入船を原則として英国船か産出国側の船に限り、オランダ船の排除をねらった。これに対抗して第1次英蘭戦争が起こり、一連の戦争で優勢となったイギリスが、衰退したオランダに代わり制海権を握った。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "部分解答",
    "answer": "航海法はイギリス貿易を保護するため制定された。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "主体又は年代の逆転",
    "answer": "航海法はオランダ貿易を保護するため制定された。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "否定",
    "answer": "航海法はイギリス貿易を保護する目的ではなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "語句の列挙",
    "answer": "航海法、イギリス、貿易、保護、ヨーロッパ産品、輸入船、原則、英国船、産出国側の船、オランダ船、排除、第1次英蘭戦争、制海権。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "誤帰属",
    "answer": "航海法はイギリス貿易を保護するため制定されたという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "正誤併記",
    "answer": "航海法はイギリス貿易を保護するため制定された。航海法はオランダ貿易を保護するため制定された。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "仮定の中の正答",
    "answer": "仮に航海法はイギリス貿易を保護するため制定された。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "模範解答",
    "answer": "第一次世界大戦中、従来男性が担った社会領域へ女性が進出し、戦時協力を背景に参政権が拡大した。イギリスの1918年の年齢条件は男性21歳以上・女性30歳以上で、1928年には男女とも21歳以上となった。アメリカでも戦時協力を経て1920年に女性参政権が実現した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "許容する言い換え",
    "answer": "第一次世界大戦中、男性の領域へ女性が進出し、戦時協力の結果参政権が広がった。イギリスは1918年に男性21歳以上・女性30歳以上とし、1928年には男女同じ21歳以上になった。米国でも戦時協力を経て1920年に女性参政権が実現した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "全角数字と空白改行",
    "answer": "第一次世界大戦中、従来男性が担った社会領域へ女性が進出し、戦時協力を背景に参政権が拡大した。\n イギリスの１９１８年の年齢条件は男性２１歳以上・女性３０歳以上で、１９２８年には男女とも２１歳以上となった。\n アメリカでも戦時協力を経て１９２０年に女性参政権が実現した。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "語句の途中で改行",
    "answer": "第一次世界大戦中\n、従来男性が担っ\nた社会領域へ女性\nが進出し、戦時協\n力を背景に参政権\nが拡大した。イギ\nリスの1918年\nの年齢条件は男性\n21歳以上・女性\n30歳以上で、1\n928年には男女\nとも21歳以上と\nなった。アメリカ\nでも戦時協力を経\nて1920年に女\n性参政権が実現し\nた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "疑問符付き答案",
    "answer": "第一次世界大戦中、従来男性が担った社会領域へ女性が進出し、戦時協力を背景に参政権が拡大した。イギリスの1918年の年齢条件は男性21歳以上・女性30歳以上で、1928年には男女とも21歳以上となった。アメリカでも戦時協力を経て1920年に女性参政権が実現した。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "部分解答",
    "answer": "第一次世界大戦中、男性の領域へ女性が進出し、戦時協力を背景に参政権が拡大した。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "主体又は年代の逆転",
    "answer": "第一次世界大戦中、女性は社会進出しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "否定",
    "answer": "第一次世界大戦中、男性の領域へ女性が進出しても、戦時協力を背景に参政権は拡大しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "語句の列挙",
    "answer": "第一次世界大戦、男性、女性、進出、戦時協力、参政権、拡大、イギリス、1918年、男性21歳以上、女性30歳以上、1928年、アメリカ、1920年。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "誤帰属",
    "answer": "第一次世界大戦中、男性の領域へ女性が進出し、戦時協力を背景に参政権が拡大したという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "正誤併記",
    "answer": "第一次世界大戦中、男性の領域へ女性が進出し、戦時協力を背景に参政権が拡大した。第一次世界大戦中、女性は社会進出しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "仮定の中の正答",
    "answer": "仮に第一次世界大戦中、男性の領域へ女性が進出し、戦時協力を背景に参政権が拡大した。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "模範解答",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示し、トマス=クックの団体旅行は旅行が大衆の娯楽となる契機になった。パリでは電気館や動く歩道が第2次産業革命の成果を示し、パリ=オリンピックも同時に開かれた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "許容する言い換え",
    "answer": "ロンドンは鉄とガラスの水晶宮で工業技術を示した。トマス・クックの団体旅行は旅行を大衆の娯楽とするきっかけになった。パリの電気館と動く歩道は第二次産業革命の成果を示し、パリ・オリンピックも同時に開催された。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "全角数字と空白改行",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示し、トマス=クックの団体旅行は旅行が大衆の娯楽となる契機になった。\n パリでは電気館や動く歩道が第２次産業革命の成果を示し、パリ=オリンピックも同時に開かれた。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "語句の途中で改行",
    "answer": "ロンドンでは鉄と\nガラスの水晶宮が\n工業力を示し、ト\nマス=クックの団\n体旅行は旅行が大\n衆の娯楽となる契\n機になった。パリ\nでは電気館や動く\n歩道が第2次産業\n革命の成果を示し\n、パリ=オリンピ\nックも同時に開か\nれた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "疑問符付き答案",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示し、トマス=クックの団体旅行は旅行が大衆の娯楽となる契機になった。パリでは電気館や動く歩道が第2次産業革命の成果を示し、パリ=オリンピックも同時に開かれた。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "部分解答",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示した。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "主体又は年代の逆転",
    "answer": "ロンドンでは木と石の水晶宮が工業力を示した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "否定",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示さなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "語句の列挙",
    "answer": "ロンドン、鉄、ガラス、水晶宮、工業力、トマス=クック、団体旅行、大衆の娯楽、パリ、電気館、動く歩道、第2次産業革命、パリ=オリンピック。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "誤帰属",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示したという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "正誤併記",
    "answer": "ロンドンでは鉄とガラスの水晶宮が工業力を示した。ロンドンでは木と石の水晶宮が工業力を示した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "仮定の中の正答",
    "answer": "仮にロンドンでは鉄とガラスの水晶宮が工業力を示した。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "模範解答",
    "answer": "国際連盟総会は原則全会一致だったが、国連総会は多数決となった。国連では安全保障理事会の権限を強め、経済・外交・軍事的制裁で加盟国を法的に拘束する決定を可能にした。一方、常任理事国には拒否権があり、重要事項の決定を制約し、冷戦期には多用された。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "許容する言い換え",
    "answer": "国際連盟総会は原則として全会一致、国連総会は多数決となった。国連は安全保障理事会の権限を強化し、経済・外交・軍事的制裁で加盟国を法的に拘束する決定を可能にした。常任理事国の拒否権は冷戦期に多用され、重要事項の決定を制約した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "全角数字と空白改行",
    "answer": "国際連盟総会は原則全会一致だったが、国連総会は多数決となった。\n 国連では安全保障理事会の権限を強め、経済・外交・軍事的制裁で加盟国を法的に拘束する決定を可能にした。\n 一方、常任理事国には拒否権があり、重要事項の決定を制約し、冷戦期には多用された。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "語句の途中で改行",
    "answer": "国際連盟総会は原\n則全会一致だった\nが、国連総会は多\n数決となった。国\n連では安全保障理\n事会の権限を強め\n、経済・外交・軍\n事的制裁で加盟国\nを法的に拘束する\n決定を可能にした\n。一方、常任理事\n国には拒否権があ\nり、重要事項の決\n定を制約し、冷戦\n期には多用された\n。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "疑問符付き答案",
    "answer": "国際連盟総会は原則全会一致だったが、国連総会は多数決となった。国連では安全保障理事会の権限を強め、経済・外交・軍事的制裁で加盟国を法的に拘束する決定を可能にした。一方、常任理事国には拒否権があり、重要事項の決定を制約し、冷戦期には多用された。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "部分解答",
    "answer": "国際連盟総会は原則全会一致、国連総会は多数決となった。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "主体又は年代の逆転",
    "answer": "国際連盟総会は多数決、国連総会は全会一致となった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "否定",
    "answer": "国際連盟総会は原則全会一致、国連総会は多数決とはならなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "語句の列挙",
    "answer": "国際連盟総会、原則全会一致、国連総会、多数決、安全保障理事会、権限、経済、外交、軍事的制裁、加盟国、法的に拘束、決定、常任理事国、拒否権、冷戦期。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "誤帰属",
    "answer": "国際連盟総会は原則全会一致、国連総会は多数決となったという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "正誤併記",
    "answer": "国際連盟総会は原則全会一致、国連総会は多数決となった。国際連盟総会は多数決、国連総会は全会一致となった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "仮定の中の正答",
    "answer": "仮に国際連盟総会は原則全会一致、国連総会は多数決となった。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "模範解答",
    "answer": "支配地の拡大をめざす封建領主は、未開地に修道院を招いて開墾を進めた。1098年にフランスで創設されたシトー修道会は清貧と労働を重んじ、12世紀以降、大開墾運動の中心となった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "許容する言い換え",
    "answer": "封建領主は支配地の拡大を目指した。封建領主が未開地に修道院を招き開墾を進めた。12世紀以降、シトー修道会が大開墾運動の中心となり、シトー修道会は清貧と労働を重視した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "全角数字と空白改行",
    "answer": "支配地の拡大をめざす封建領主は、未開地に修道院を招いて開墾を進めた。\n １０９８年にフランスで創設されたシトー修道会は清貧と労働を重んじ、１２世紀以降、大開墾運動の中心となった。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "語句の途中で改行",
    "answer": "支配地の拡大をめ\nざす封建領主は、\n未開地に修道院を\n招いて開墾を進め\nた。1098年に\nフランスで創設さ\nれたシトー修道会\nは清貧と労働を重\nんじ、12世紀以\n降、大開墾運動の\n中心となった。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "疑問符付き答案",
    "answer": "支配地の拡大をめざす封建領主は、未開地に修道院を招いて開墾を進めた。1098年にフランスで創設されたシトー修道会は清貧と労働を重んじ、12世紀以降、大開墾運動の中心となった。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "部分解答",
    "answer": "封建領主は支配地の拡大を目指した。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "主体又は年代の逆転",
    "answer": "封建領主は支配地の縮小を目指した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "否定",
    "answer": "封建領主は支配地の拡大を目指さなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "語句の列挙",
    "answer": "封建領主、支配地、拡大、未開地、修道院、開墾、シトー修道会、12世紀以降、大開墾運動、中心、清貧、労働。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "誤帰属",
    "answer": "封建領主は支配地の拡大を目指したという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "正誤併記",
    "answer": "封建領主は支配地の拡大を目指した。封建領主は支配地の縮小を目指した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "仮定の中の正答",
    "answer": "仮に封建領主は支配地の拡大を目指した。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "模範解答",
    "answer": "インカ帝国はアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。モンゴル帝国・元朝のジャムチは、駅ごとに交通手段や宿泊を提供し、旅行者・物資・情報を運んだ。元では近隣住民から選ばれた站戸が、牌符を持つ使節・軍人・官吏に食料や馬を提供した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "許容する言い換え",
    "answer": "インカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。モンゴルのジャムチは駅ごとに宿泊と交通手段を提供し、ジャムチは旅行者・物資・情報の移動を支えた。元の近隣住民から選ばれた站戸は牌符を持つ使節に食料と馬を提供した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "全角数字と空白改行",
    "answer": "インカ帝国はアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。\n モンゴル帝国・元朝のジャムチは、駅ごとに交通手段や宿泊を提供し、旅行者・物資・情報を運んだ。\n 元では近隣住民から選ばれた站戸が、牌符を持つ使節・軍人・官吏に食料や馬を提供した。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "語句の途中で改行",
    "answer": "インカ帝国はアン\nデスの都市を道路\nで結び、飛脚が王\nの命令をリレーで\n伝えた。モンゴル\n帝国・元朝のジャ\nムチは、駅ごとに\n交通手段や宿泊を\n提供し、旅行者・\n物資・情報を運ん\nだ。元では近隣住\n民から選ばれた站\n戸が、牌符を持つ\n使節・軍人・官吏\nに食料や馬を提供\nした。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "疑問符付き答案",
    "answer": "インカ帝国はアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。モンゴル帝国・元朝のジャムチは、駅ごとに交通手段や宿泊を提供し、旅行者・物資・情報を運んだ。元では近隣住民から選ばれた站戸が、牌符を持つ使節・軍人・官吏に食料や馬を提供した。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "部分解答",
    "answer": "インカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "主体又は年代の逆転",
    "answer": "インカはアンデスの都市を道路で結んだが、飛脚は命令を伝えなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "否定",
    "answer": "インカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "語句の列挙",
    "answer": "インカ、アンデス、都市、道路、飛脚、王の命令、リレー、モンゴル、元朝、ジャムチ、駅ごと、宿泊、交通手段、旅行者、物資、情報、近隣住民、站戸、牌符、使節、食料、馬。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "誤帰属",
    "answer": "インカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えたという説明は誤りである。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "正誤併記",
    "answer": "インカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。インカはアンデスの都市を道路で結んだが、飛脚は命令を伝えなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "仮定の中の正答",
    "answer": "仮にインカはアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えた。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "模範解答",
    "answer": "マルサスは1798年刊の『人口論』で、食料は算術級数的、人口は幾何級数的に増えるとし、人口増加が食料の増加を上回るため貧困化は避けられないと説いた。その解決策として人口の抑制を主張した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "許容する言い換え",
    "answer": "食料は算術級数的に増加し、人口は幾何級数的に増加する。人口の増加が食料の増加を上回るので貧困が生じるとした。解決策に人口増加を抑制することを説いた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "全角数字と空白改行",
    "answer": "マルサスは１７９８年刊の『人口論』で、食料は算術級数的、人口は幾何級数的に増えるとし、人口増加が食料の増加を上回るため貧困化は避けられないと説いた。\n その解決策として人口の抑制を主張した。\n ",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "語句の途中で改行",
    "answer": "マルサスは179\n8年刊の『人口論\n』で、食料は算術\n級数的、人口は幾\n何級数的に増える\nとし、人口増加が\n食料の増加を上回\nるため貧困化は避\nけられないと説い\nた。その解決策と\nして人口の抑制を\n主張した。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "疑問符付き答案",
    "answer": "マルサスは1798年刊の『人口論』で、食料は算術級数的、人口は幾何級数的に増えるとし、人口増加が食料の増加を上回るため貧困化は避けられないと説いた。その解決策として人口の抑制を主張した。？",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "部分解答",
    "answer": "食料は算術級数的に増加する。",
    "must_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "主体又は年代の逆転",
    "answer": "食料は幾何級数的に増加する。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "否定",
    "answer": "食料は算術級数的に増加しない。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "語句の列挙",
    "answer": "食料、算術級数的、人口、幾何級数的、人口増加、食料の増加、上回る、ため、貧困化、避けられない、解決策、人口の抑制。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "未知表現",
    "answer": "この問題では、社会の変化について考える必要がある。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "誤帰属",
    "answer": "ルソーは食料が算術級数的に増加すると説いた。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "正誤併記",
    "answer": "食料は算術級数的に増加する。食料は幾何級数的に増加する。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "仮定の中の正答",
    "answer": "仮に食料は算術級数的に増加する。とすればよい。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "字数超過",
    "answer": "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
    "expected_grading_status": "invalid",
    "expected_score": null
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素1の独立誤答例",
    "answer": "第1次は18〜19世紀に行われた。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素2の独立誤答例",
    "answer": "第1次は穀物増産を目的として牧羊地を減らした。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素3の独立誤答例",
    "answer": "第2次は15世紀末から17世紀半ばに進んだ。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素4の独立誤答例",
    "answer": "第2次は人口減少と穀物過剰への対応として穀物増産を進めた。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素5の独立誤答例",
    "answer": "第2次では議会の承認を得ず穀物増産を進めた。",
    "must_not_match": [
      "e5"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素6の独立誤答例",
    "answer": "囲い込みによって農民が土地を得た。",
    "must_not_match": [
      "e6"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "要素7の独立誤答例",
    "answer": "工場労働者が農民に土地を与えたため産業革命が進んだ。",
    "must_not_match": [
      "e7"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "要素1の独立誤答例",
    "answer": "ロゼッタ=ストーンはルイ14世のエジプト遠征で発見された。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "要素2の独立誤答例",
    "answer": "ロゼッタ=ストーンは敗北後にフランスへ渡った。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "要素3の独立誤答例",
    "answer": "円明園は普仏戦争で英仏軍が略奪し破壊した。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "要素4の独立誤答例",
    "answer": "軍事行動は文化財の移動と喪失を防いだ。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素1の独立誤答例",
    "answer": "第1次は18世紀後半のフランスで始まった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素2の独立誤答例",
    "answer": "第1次は石油を燃料とする蒸気機関を動力とした。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素3の独立誤答例",
    "answer": "第1次は重化学工業を中心に進んだ。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素4の独立誤答例",
    "answer": "第2次は1770年代から始まった。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素5の独立誤答例",
    "answer": "第2次は石炭だけを新動力源として進んだ。",
    "must_not_match": [
      "e5"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g01-q08",
    "name": "要素6の独立誤答例",
    "answer": "第2次は綿工業を中心に進んだ。",
    "must_not_match": [
      "e6"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "要素1の独立誤答例",
    "answer": "ルイ14世は1598年にナントの王令を発布した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "要素2の独立誤答例",
    "answer": "ナントの王令はユグノーが条件付きで信仰の自由を認めた。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "要素3の独立誤答例",
    "answer": "アンリ4世は1685年に王令を廃止した。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-02-g03-q08",
    "name": "要素4の独立誤答例",
    "answer": "ユグノーがイギリスやオランダへ亡命し、フランスの産業・経済が発展した。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "要素1の独立誤答例",
    "answer": "産業革命期の都市では住宅と生活環境が改善した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "要素2の独立誤答例",
    "answer": "清潔な水によってコレラが流行した。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "要素3の独立誤答例",
    "answer": "細菌学と予防医学の知見から上下水道を廃止した。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "要素4の独立誤答例",
    "answer": "衛生対策は幼児死亡率を上昇させ、平均寿命を短くした。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "要素1の独立誤答例",
    "answer": "航海法はオランダ貿易を保護するため制定された。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "要素2の独立誤答例",
    "answer": "欧州産品の輸入船を原則としてオランダ船に限り英国船を排除した。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "要素3の独立誤答例",
    "answer": "航海法を契機に普仏戦争が起きた。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "要素4の独立誤答例",
    "answer": "一連の戦争で優勢となったオランダがイギリスに代わり制海権を握った。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "要素1の独立誤答例",
    "answer": "第一次世界大戦中、女性は社会進出しなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "要素2の独立誤答例",
    "answer": "イギリスの1918年は男性30歳以上、女性21歳以上で参政権が認められた。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "要素3の独立誤答例",
    "answer": "1928年のイギリスは男性21歳以上、女性30歳以上となった。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g01-q07",
    "name": "要素4の独立誤答例",
    "answer": "アメリカは戦時協力を経て1918年に女性参政権が実現した。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "要素1の独立誤答例",
    "answer": "ロンドンでは木と石の水晶宮が工業力を示した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "要素2の独立誤答例",
    "answer": "トマス=クックの団体旅行は旅行を大衆の娯楽にしなかった。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "要素3の独立誤答例",
    "answer": "パリの電気館や動く歩道は第1次産業革命の成果を示した。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "要素4の独立誤答例",
    "answer": "1900年パリ万博ではロンドンオリンピックが同時開催された。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "要素1の独立誤答例",
    "answer": "国際連盟総会は多数決、国連総会は全会一致となった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "要素2の独立誤答例",
    "answer": "国連は安全保障理事会の権限を弱めた。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "要素3の独立誤答例",
    "answer": "経済・外交・軍事的制裁の決定は加盟国を法的に拘束しない。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "要素4の独立誤答例",
    "answer": "常任理事国は拒否権を持たなかった。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "要素1の独立誤答例",
    "answer": "封建領主は支配地の縮小を目指した。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "要素2の独立誤答例",
    "answer": "封建領主は未開地へ修道院を招かなかった。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "要素3の独立誤答例",
    "answer": "12世紀以降、ベネディクト修道会が大開墾運動の中心となった。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "要素4の独立誤答例",
    "answer": "シトー修道会は清貧と労働を軽視した。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "要素1の独立誤答例",
    "answer": "インカはアンデスの都市を道路で結んだが、飛脚は王の命令を伝えなかった。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "要素2の独立誤答例",
    "answer": "モンゴルのジャムチは駅ごとに宿泊を提供しなかった。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "要素3の独立誤答例",
    "answer": "ジャムチは旅行者・物資・情報を運ばなかった。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g01-q08",
    "name": "要素4の独立誤答例",
    "answer": "元の站戸は牌符を持つ使節へ食料や馬を提供しなかった。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "要素1の独立誤答例",
    "answer": "食料は幾何級数的に増加する。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "要素2の独立誤答例",
    "answer": "人口は算術級数的に増加する。",
    "must_not_match": [
      "e2"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "要素3の独立誤答例",
    "answer": "食料の増加が人口の増加を上回るため貧困が生じる。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "要素4の独立誤答例",
    "answer": "その解決策として人口の増加を主張した。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-06-g03-q08",
    "name": "全要素を伴う他者への誤帰属",
    "answer": "ルソーは1798年刊の『人口論』で、食料は算術級数的、人口は幾何級数的に増えるとし、人口増加が食料の増加を上回るため貧困化は避けられないと説いた。その解決策として人口の抑制を主張した。",
    "must_not_match": [
      "e1",
      "e2",
      "e3",
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g02-q07",
    "name": "別主体の年代を第一段階へ誤結合しない",
    "answer": "第1次は17世紀半ば、第2次は18〜19世紀に進んだ。",
    "must_pending": [
      "e1"
    ]
  },
  {
    "profile_id": "mock-05-g03-q08",
    "name": "支配地拡大の目的を商人へ誤帰属",
    "answer": "支配地の拡大を目指したのは商人で、封建領主は未開地に修道院を招いた。",
    "must_not_match": [
      "e1"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g01-q08",
    "name": "衛生対策の一例だけでも当該要素を認める",
    "answer": "細菌学と予防医学の知見を公衆衛生に生かし、上下水道を整備した。",
    "must_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-05-g01-q08",
    "name": "連盟の制裁を安保理の権限として加点しない",
    "answer": "国際連盟は経済・外交・軍事的制裁について加盟国を法的に拘束する決定が可能だった。",
    "must_not_match": [
      "e3"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-03-g03-q08",
    "name": "優勢と制海権の主体が逆転した文",
    "answer": "一連の戦争で優勢だったイギリスが敗北し、衰退したオランダが制海権を握った。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-04-g03-q07",
    "name": "別年の博覧会と五輪を同時開催としない",
    "answer": "1889年パリ万博ではパリ=オリンピックも同時に開かれた。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "二事例のない一般論だけでは結論要素を加点しない",
    "answer": "戦争は文化財の移動と喪失を招いた。",
    "must_not_match": [
      "e4"
    ],
    "expect_unsettled": true
  },
  {
    "profile_id": "mock-01-g03-q08",
    "name": "二事例が逆順でも結論を結び付ける",
    "answer": "円明園はアロー戦争で英仏軍が略奪・破壊した。ロゼッタ=ストーンはナポレオンのエジプト遠征で発見され敗北後に英国へ移った。軍事行動は文化財の移動と喪失を招いた。",
    "expected_confirmed_points": 8,
    "expected_score": 8
  }
]
