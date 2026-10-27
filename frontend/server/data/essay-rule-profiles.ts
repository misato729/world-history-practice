import type { EssayScoringProfile } from '../../shared/types/essay.ts'

/** Reviewed, versioned scoring rules; this catalog never inserts questions into a database. */
export const essayRuleProfiles: EssayScoringProfile[] = [
  {
    "id": "mock-01-g02-q07",
    "version": 1,
    "title": "囲い込みと産業革命",
    "max_characters": 140,
    "required_terms": [
      "牧羊",
      "穀物",
      "工場労働者"
    ],
    "elements": [
      {
        "id": "e1",
        "label": "第1次の時期を15世紀末から17世紀半ばと示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "15世紀末"
              ],
              [
                "17世紀半ば",
                "17世紀中頃",
                "17世紀中ごろ"
              ],
              [
                "進んだ",
                "行われた",
                "転換した",
                "変えた"
              ]
            ],
            "max_gap": 55,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第1次は18〜19世紀",
                "第一次は18〜19世紀",
                "第1次は18世紀から19世紀",
                "第一次は18世紀から19世紀"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "第1次は毛織物市場の拡大を背景に牧羊地化を目的としたと示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "毛織物市場",
                "毛織物の市場"
              ],
              [
                "拡大",
                "拡張"
              ],
              [
                "牧羊"
              ],
              [
                "転換",
                "変え",
                "目的",
                "進め"
              ]
            ],
            "max_gap": 40,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "穀物増産"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "第2次の時期を18〜19世紀と示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "18〜19世紀",
                "18~19世紀",
                "18から19世紀",
                "18世紀から19世紀"
              ],
              [
                "進めた",
                "行われた",
                "進んだ"
              ]
            ],
            "max_gap": 55,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第2次は15世紀末",
                "第二次は15世紀末"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "第2次は人口増加・穀物不足への対応として穀物増産を目的としたと示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "人口増加"
              ],
              [
                "穀物不足"
              ],
              [
                "穀物増産",
                "穀物の増産",
                "穀物を増産"
              ]
            ],
            "max_gap": 40,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "牧羊"
              ],
              [
                "目的",
                "転換"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e5",
        "label": "第2次が議会の承認のもとで進められたことを示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "議会"
              ],
              [
                "承認",
                "許可"
              ],
              [
                "進めた",
                "進められ",
                "増産"
              ]
            ],
            "max_gap": 50,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "議会"
              ],
              [
                "承認しなかった",
                "承認を得ず"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e6",
        "label": "囲い込みによって土地を失った農民が生じたことを示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "土地を失った農民"
              ],
              [
                "都市へ移り",
                "都市に移り",
                "都市へ流入",
                "都市に流入"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "農民"
              ],
              [
                "土地を失"
              ],
              [
                "生じた",
                "現れた"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "農民"
              ],
              [
                "土地を得た"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e7",
        "label": "土地を失った農民が都市に流入して工場労働者となり、産業革命を支えたという因果関係を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "土地を失った農民"
              ],
              [
                "都市へ移り",
                "都市に移り",
                "都市へ流入",
                "都市に流入"
              ],
              [
                "工場労働者"
              ],
              [
                "産業革命を支えた",
                "産業革命の担い手",
                "産業革命を担った"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "工場労働者"
              ],
              [
                "農民に土地を与え"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-01-g03-q08",
    "version": 1,
    "title": "軍事行動と文化財",
    "max_characters": 100,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "ロゼッタ=ストーンの発見をナポレオンのエジプト遠征に結び付ける。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ロゼッタ"
              ],
              [
                "ナポレオン"
              ],
              [
                "エジプト遠征"
              ],
              [
                "発見し",
                "発見した",
                "発見され"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ロゼッタ"
              ],
              [
                "ルイ14世"
              ],
              [
                "発見"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "遠征隊の敗北後にロゼッタ=ストーンがイギリスへ渡ったことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ロゼッタ"
              ],
              [
                "敗北後",
                "敗戦後"
              ],
              [
                "イギリス",
                "英国"
              ],
              [
                "渡った",
                "移った"
              ]
            ],
            "max_gap": 42,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ロゼッタ"
              ],
              [
                "敗北後",
                "敗戦後"
              ],
              [
                "フランス"
              ],
              [
                "渡った",
                "移った"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "円明園の略奪・破壊をアロー戦争（第2次アヘン戦争）と英仏軍に結び付ける。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "円明園"
              ],
              [
                "アロー戦争",
                "第2次アヘン戦争",
                "第二次アヘン戦争"
              ],
              [
                "英仏軍",
                "英国とフランスの軍"
              ],
              [
                "略奪"
              ],
              [
                "破壊し",
                "破壊された"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "円明園"
              ],
              [
                "普仏戦争"
              ],
              [
                "破壊"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "二事例に即して、軍事行動が文化財の移動と破壊・喪失に結び付いたことを説明する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ロゼッタ"
              ],
              [
                "敗北後",
                "敗戦後"
              ],
              [
                "イギリス",
                "英国"
              ],
              [
                "渡った",
                "移った"
              ],
              [
                "円明園"
              ],
              [
                "略奪"
              ],
              [
                "破壊し",
                "破壊された"
              ],
              [
                "軍事行動",
                "戦争"
              ],
              [
                "文化財"
              ],
              [
                "移動"
              ],
              [
                "喪失",
                "破壊"
              ],
              [
                "もたらした",
                "招いた",
                "つながった"
              ]
            ],
            "max_gap": 50,
            "scope": "answer"
          },
          {
            "sequence": [
              [
                "円明園"
              ],
              [
                "略奪"
              ],
              [
                "破壊し",
                "破壊された"
              ],
              [
                "ロゼッタ"
              ],
              [
                "敗北後",
                "敗戦後"
              ],
              [
                "イギリス",
                "英国"
              ],
              [
                "渡った",
                "移った"
              ],
              [
                "軍事行動",
                "戦争"
              ],
              [
                "文化財"
              ],
              [
                "移動"
              ],
              [
                "喪失",
                "破壊"
              ],
              [
                "もたらした",
                "招いた",
                "つながった"
              ]
            ],
            "max_gap": 50,
            "scope": "answer"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "軍事行動"
              ],
              [
                "文化財の移動"
              ],
              [
                "防いだ",
                "阻止した"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-02-g01-q08",
    "version": 1,
    "title": "第1次・第2次産業革命",
    "max_characters": 100,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "第1次の開始を18世紀後半のイギリスに結び付ける。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "18世紀後半"
              ],
              [
                "イギリス",
                "英国"
              ],
              [
                "始まった",
                "進んだ",
                "展開した"
              ]
            ],
            "max_gap": 55,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "19世紀後半"
              ],
              [
                "イギリス",
                "英国"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "18世紀後半"
              ],
              [
                "フランス"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "第1次で石炭を燃料とする蒸気機関が重要な動力となったことを示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "石炭"
              ],
              [
                "蒸気機関"
              ],
              [
                "利用",
                "動力",
                "使用"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "石油"
              ],
              [
                "蒸気機関"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "第1次の中心分野として綿工業を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "綿工業"
              ],
              [
                "中心",
                "主軸"
              ]
            ],
            "max_gap": 48,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第1次",
                "第一次"
              ],
              [
                "重化学工業"
              ],
              [
                "中心"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "第2次の開始時期を1870年代と示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "1870年代"
              ],
              [
                "から",
                "に始ま",
                "より"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "1770年代"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e5",
        "label": "第2次で電力・石油が新動力源となったことを示す。",
        "points": 1,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "電力"
              ],
              [
                "石油"
              ],
              [
                "新動力源",
                "動力源",
                "エネルギー源"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "石炭だけ"
              ],
              [
                "動力源"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e6",
        "label": "第2次の中心分野として重化学工業を示し、第1次と区別する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "重化学工業"
              ],
              [
                "中心",
                "主軸"
              ]
            ],
            "max_gap": 42,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第2次",
                "第二次"
              ],
              [
                "綿工業"
              ],
              [
                "中心"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-02-g03-q08",
    "version": 1,
    "title": "ユグノーとナントの王令",
    "max_characters": 120,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "アンリ4世による1598年のナントの王令発布を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "アンリ4世"
              ],
              [
                "1598年"
              ],
              [
                "ナントの王令"
              ],
              [
                "発布",
                "出した",
                "制定",
                "でユグノー"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ルイ14世"
              ],
              [
                "1598年"
              ],
              [
                "ナントの王令"
              ],
              [
                "発布"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "アンリ4世"
              ],
              [
                "1685年"
              ],
              [
                "ナントの王令"
              ],
              [
                "発布"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "王令がユグノーに条件付きで信仰の自由を認めたことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "王令",
                "ナントの王令"
              ],
              [
                "ユグノーに"
              ],
              [
                "条件付き"
              ],
              [
                "信仰の自由"
              ],
              [
                "認めた",
                "保障した"
              ]
            ],
            "max_gap": 28,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "王令"
              ],
              [
                "ユグノー"
              ],
              [
                "信仰の自由を認めなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "ルイ14世による1685年の王令廃止を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ルイ14世"
              ],
              [
                "1685年"
              ],
              [
                "王令",
                "ナントの王令"
              ],
              [
                "廃止",
                "撤回"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "アンリ4世"
              ],
              [
                "1685年"
              ],
              [
                "王令"
              ],
              [
                "廃止"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "ユグノーのイギリス・オランダなどへの亡命と、フランスの産業・経済停滞の関係を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "イギリス",
                "英国"
              ],
              [
                "オランダ"
              ],
              [
                "亡命"
              ],
              [
                "フランス"
              ],
              [
                "産業"
              ],
              [
                "経済"
              ],
              [
                "停滞",
                "衰退"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "ユグノー"
              ],
              [
                "亡命"
              ],
              [
                "フランスの産業"
              ],
              [
                "停滞",
                "衰退"
              ]
            ],
            "max_gap": 32,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ユグノー"
              ],
              [
                "亡命"
              ],
              [
                "フランスの産業"
              ],
              [
                "発展"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-03-g01-q08",
    "version": 1,
    "title": "産業革命期の公衆衛生",
    "max_characters": 120,
    "required_terms": [
      "コレラ",
      "上下水道"
    ],
    "elements": [
      {
        "id": "e1",
        "label": "産業革命期の都市の住宅・生活環境の悪化を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "産業革命"
              ],
              [
                "都市"
              ],
              [
                "住宅"
              ],
              [
                "生活環境"
              ],
              [
                "悪化"
              ]
            ],
            "max_gap": 30,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "産業革命"
              ],
              [
                "都市"
              ],
              [
                "生活環境"
              ],
              [
                "改善した"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "汚染された水とコレラ流行を原因と結果として結ぶ。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "汚染された水",
                "汚れた水"
              ],
              [
                "コレラ"
              ],
              [
                "流行した",
                "流行を招いた",
                "広まった"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "清潔な水"
              ],
              [
                "コレラ"
              ],
              [
                "流行"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "細菌学・予防医学の知見を公衆衛生の対策（上下水道やごみ収集等）と結び付ける。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "細菌学"
              ],
              [
                "予防医学"
              ],
              [
                "公衆衛生"
              ],
              [
                "上下水道",
                "ごみ収集",
                "ゴミ収集"
              ],
              [
                "整え",
                "整備"
              ]
            ],
            "max_gap": 32,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "細菌学"
              ],
              [
                "予防医学"
              ],
              [
                "上下水道を廃止"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "衛生対策から幼児死亡率低下・平均寿命伸長へのつながりを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "整えられ",
                "整備され",
                "衛生対策"
              ],
              [
                "幼児死亡率"
              ],
              [
                "低下"
              ],
              [
                "平均寿命"
              ],
              [
                "伸長",
                "延長",
                "延び"
              ]
            ],
            "max_gap": 22,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "衛生対策"
              ],
              [
                "幼児死亡率"
              ],
              [
                "上昇"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-03-g03-q08",
    "version": 1,
    "title": "航海法と英蘭戦争",
    "max_characters": 120,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "イギリス貿易の保護・促進という目的を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "航海法"
              ],
              [
                "イギリス",
                "英国"
              ],
              [
                "貿易"
              ],
              [
                "保護",
                "促進"
              ],
              [
                "ため",
                "目的"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "航海法"
              ],
              [
                "オランダ貿易を保護"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "ヨーロッパ産品の輸入船を原則として英国船か産出国側の船に限り、オランダ船の排除をねらったことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "欧州産品",
                "ヨーロッパ産品"
              ],
              [
                "輸入船"
              ],
              [
                "原則"
              ],
              [
                "英国船",
                "イギリス船"
              ],
              [
                "産出国側の船",
                "産出国の船"
              ],
              [
                "限り"
              ],
              [
                "オランダ船"
              ],
              [
                "排除"
              ]
            ],
            "max_gap": 28,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "欧州産品",
                "ヨーロッパ産品"
              ],
              [
                "輸入船"
              ],
              [
                "オランダ船に限"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "航海法への対抗が第1次英蘭戦争の契機となったことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "対抗して",
                "対抗し",
                "対抗が",
                "航海法への対抗"
              ],
              [
                "第1次英蘭戦争",
                "第一次英蘭戦争"
              ],
              [
                "起こり",
                "起き",
                "契機",
                "原因"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "航海法"
              ],
              [
                "普仏戦争"
              ],
              [
                "契機"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "一連の英蘭戦争でイギリスが全般的に優勢となり、衰退したオランダに代わり制海権を握ったことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "一連の戦争",
                "一連の英蘭戦争"
              ],
              [
                "優勢",
                "優位"
              ],
              [
                "イギリスが"
              ],
              [
                "衰退したオランダに代わり",
                "衰えたオランダに代わり",
                "衰退したオランダに代わって",
                "衰えたオランダに代わって"
              ],
              [
                "制海権"
              ],
              [
                "握った",
                "獲得した"
              ]
            ],
            "max_gap": 34,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "一連の戦争"
              ],
              [
                "オランダ"
              ],
              [
                "イギリスに代わり"
              ],
              [
                "制海権"
              ],
              [
                "握った"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-04-g01-q07",
    "version": 1,
    "title": "大戦と女性参政権",
    "max_characters": 140,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "大戦中、それまで男性が占めた社会領域への女性の進出・戦時協力を、参政権拡大の背景として結ぶ。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "第一次世界大戦",
                "第1次世界大戦"
              ],
              [
                "男性"
              ],
              [
                "女性"
              ],
              [
                "進出"
              ],
              [
                "戦時協力"
              ],
              [
                "背景",
                "結果"
              ],
              [
                "参政権"
              ],
              [
                "拡大",
                "広が"
              ]
            ],
            "max_gap": 34,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "第一次世界大戦"
              ],
              [
                "女性"
              ],
              [
                "社会進出しなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "イギリスの1918年には男性21歳以上・女性30歳以上という異なる年齢条件で参政権が認められたことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "イギリス"
              ],
              [
                "1918年"
              ],
              [
                "男性21歳以上"
              ],
              [
                "女性30歳以上"
              ],
              [
                "で",
                "とし",
                "認められ"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "1918年"
              ],
              [
                "男性30歳以上"
              ],
              [
                "女性21歳以上"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "イギリスの1928年には女性も男性と同じ21歳以上となり、参政権の男女平等が実現したことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "1928年"
              ],
              [
                "男女とも21歳以上",
                "男女同じ21歳以上",
                "男女ともに21歳以上"
              ],
              [
                "なった",
                "認められた"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "1928年"
              ],
              [
                "女性30歳以上"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "アメリカでは大戦中の戦時協力を経て、1920年に女性参政権が実現したことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "アメリカ",
                "米国"
              ],
              [
                "戦時協力"
              ],
              [
                "1920年"
              ],
              [
                "女性参政権"
              ],
              [
                "実現",
                "認められた"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "アメリカ"
              ],
              [
                "1918年"
              ],
              [
                "女性参政権"
              ],
              [
                "実現"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-04-g03-q07",
    "version": 1,
    "title": "万国博覧会と技術・大衆文化",
    "max_characters": 120,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "ロンドン万博では鉄とガラスによる水晶宮が、イギリスの工業技術を示したこと。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ロンドン"
              ],
              [
                "鉄"
              ],
              [
                "ガラス"
              ],
              [
                "水晶宮"
              ],
              [
                "工業力",
                "工業技術"
              ],
              [
                "示し",
                "示した"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ロンドン"
              ],
              [
                "木と石"
              ],
              [
                "水晶宮"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "トマス=クックらの団体旅行と、旅行が大衆の娯楽となる契機との関係。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "トマス=クック",
                "トマス＝クック",
                "トマス・クック",
                "トマスクック"
              ],
              [
                "団体旅行"
              ],
              [
                "旅行"
              ],
              [
                "大衆の娯楽"
              ],
              [
                "契機",
                "きっかけ"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "トマス=クック"
              ],
              [
                "団体旅行"
              ],
              [
                "大衆の娯楽にしなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "パリ万博の電気館や動く歩道を、第2次産業革命の成果と結び付けること。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "パリ"
              ],
              [
                "電気館"
              ],
              [
                "動く歩道"
              ],
              [
                "第2次産業革命",
                "第二次産業革命"
              ],
              [
                "成果"
              ],
              [
                "示し",
                "表した"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "パリ"
              ],
              [
                "電気館"
              ],
              [
                "第1次産業革命"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "1900年パリ万博とパリ=オリンピックが同時に開催されたこと。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "パリ=オリンピック",
                "パリ＝オリンピック",
                "パリ・オリンピック",
                "パリオリンピック"
              ],
              [
                "同時に開かれた",
                "同時に開催された",
                "同時開催された"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "1900年"
              ],
              [
                "パリ万博"
              ],
              [
                "オリンピック"
              ],
              [
                "同時開催"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "1900年"
              ],
              [
                "パリ万博"
              ],
              [
                "ロンドンオリンピック"
              ],
              [
                "同時"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "1851年",
                "1855年",
                "1867年",
                "1878年",
                "1889年",
                "1925年"
              ],
              [
                "パリ万博"
              ],
              [
                "パリ=オリンピック",
                "パリ＝オリンピック",
                "パリ・オリンピック",
                "パリオリンピック"
              ],
              [
                "同時"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-05-g01-q08",
    "version": 1,
    "title": "国際連盟・国際連合の意思決定",
    "max_characters": 140,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "国際連盟総会の原則全会一致と、国連総会の多数決を比較する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "国際連盟総会"
              ],
              [
                "原則全会一致",
                "原則として全会一致"
              ],
              [
                "国連総会"
              ],
              [
                "多数決"
              ],
              [
                "なった",
                "である",
                "となる"
              ]
            ],
            "max_gap": 18,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "国際連盟総会"
              ],
              [
                "多数決"
              ],
              [
                "国連総会"
              ],
              [
                "全会一致"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "国連で安全保障理事会の権限が強化されたことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "国連"
              ],
              [
                "安全保障理事会"
              ],
              [
                "権限"
              ],
              [
                "強め",
                "強化"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "安全保障理事会"
              ],
              [
                "権限"
              ],
              [
                "弱め"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "経済・外交・軍事的制裁に関し、加盟国を法的に拘束する安保理の決定を説明する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "安全保障理事会",
                "安保理"
              ],
              [
                "経済",
                "経済的"
              ],
              [
                "外交"
              ],
              [
                "軍事的制裁",
                "軍事制裁"
              ],
              [
                "加盟国を法的に拘束"
              ],
              [
                "決定"
              ],
              [
                "可能",
                "行う",
                "下す"
              ]
            ],
            "max_gap": 32,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "制裁"
              ],
              [
                "加盟国を法的に拘束しない"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "国際連盟は"
              ],
              [
                "経済",
                "経済的"
              ],
              [
                "外交"
              ],
              [
                "軍事的制裁",
                "軍事制裁"
              ],
              [
                "加盟国を法的に拘束"
              ],
              [
                "決定"
              ],
              [
                "可能"
              ]
            ],
            "max_gap": 32,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "常任理事国の拒否権と、冷戦期の多用による意思決定上の制約を結び付ける。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "常任理事国"
              ],
              [
                "拒否権"
              ],
              [
                "重要事項"
              ],
              [
                "決定"
              ],
              [
                "制約"
              ],
              [
                "冷戦期"
              ],
              [
                "多用"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "常任理事国"
              ],
              [
                "拒否権"
              ],
              [
                "冷戦期"
              ],
              [
                "多用"
              ],
              [
                "決定"
              ],
              [
                "制約"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "常任理事国"
              ],
              [
                "拒否権を持たなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-05-g03-q08",
    "version": 1,
    "title": "封建領主・修道院と大開墾",
    "max_characters": 100,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "封建領主が支配地の拡大をめざしたこと。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "支配地の拡大をめざす封建領主",
                "支配地の拡大を目指す封建領主",
                "封建領主は支配地の拡大を目指した",
                "封建領主は支配地の拡大をめざした",
                "封建領主が支配地の拡大を目指した",
                "封建領主が支配地の拡大をめざした"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "封建領主"
              ],
              [
                "支配地の縮小"
              ],
              [
                "めざ",
                "目指"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "封建領主が未開地に修道院を招き、開墾事業を進めたこと。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "封建領主"
              ],
              [
                "未開地"
              ],
              [
                "修道院"
              ],
              [
                "招い",
                "招き"
              ],
              [
                "開墾"
              ],
              [
                "進め",
                "行い",
                "実施"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "封建領主"
              ],
              [
                "修道院"
              ],
              [
                "招かなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "12世紀以降の大開墾運動の中心としてシトー修道会を挙げること。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "シトー修道会"
              ],
              [
                "12世紀以降"
              ],
              [
                "大開墾運動"
              ],
              [
                "中心"
              ],
              [
                "なった",
                "となる"
              ]
            ],
            "max_gap": 40,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "12世紀以降"
              ],
              [
                "シトー修道会"
              ],
              [
                "大開墾運動"
              ],
              [
                "中心"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ベネディクト修道会"
              ],
              [
                "12世紀以降"
              ],
              [
                "大開墾運動"
              ],
              [
                "中心"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "シトー修道会が清貧と労働を重んじたこと。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "シトー修道会"
              ],
              [
                "清貧"
              ],
              [
                "労働"
              ],
              [
                "重んじ",
                "重視"
              ]
            ],
            "max_gap": 32,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "シトー修道会"
              ],
              [
                "清貧と労働を軽視"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-06-g01-q08",
    "version": 1,
    "title": "インカ・モンゴルの駅伝制",
    "max_characters": 140,
    "required_terms": [
      "飛脚",
      "站戸"
    ],
    "elements": [
      {
        "id": "e1",
        "label": "インカでアンデスの都市を道路で結び、飛脚が王の命令をリレーで伝えたことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "インカ"
              ],
              [
                "アンデス"
              ],
              [
                "都市"
              ],
              [
                "道路"
              ],
              [
                "飛脚"
              ],
              [
                "王の命令"
              ],
              [
                "リレー"
              ],
              [
                "伝えた",
                "伝達"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "インカ"
              ],
              [
                "アンデス"
              ],
              [
                "都市"
              ],
              [
                "道路"
              ],
              [
                "飛脚"
              ],
              [
                "命令を伝えなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "モンゴル・元のジャムチが駅ごとに宿泊や交通手段を提供したことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "モンゴル",
                "元朝"
              ],
              [
                "ジャムチ"
              ],
              [
                "駅ごと"
              ],
              [
                "交通手段",
                "宿泊"
              ],
              [
                "宿泊",
                "交通手段"
              ],
              [
                "提供"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ジャムチ"
              ],
              [
                "駅ごと"
              ],
              [
                "宿泊を提供しなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "ジャムチが旅行者・物資・情報の移動を支えたことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "ジャムチ"
              ],
              [
                "旅行者"
              ],
              [
                "物資"
              ],
              [
                "情報"
              ],
              [
                "運んだ",
                "移動を支えた",
                "伝達"
              ]
            ],
            "max_gap": 48,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "ジャムチ"
              ],
              [
                "物資と情報を運ばなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "元で近隣住民から選ばれた站戸が、牌符を持つ使節らへ食料・馬などを提供したことを示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "元"
              ],
              [
                "近隣住民"
              ],
              [
                "選ばれた站戸"
              ],
              [
                "牌符"
              ],
              [
                "使節"
              ],
              [
                "食料",
                "馬"
              ],
              [
                "馬",
                "食料"
              ],
              [
                "提供"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "站戸"
              ],
              [
                "食料や馬を提供しなかった"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ]
  },
  {
    "id": "mock-06-g03-q08",
    "version": 1,
    "title": "マルサスの人口論",
    "max_characters": 100,
    "required_terms": [],
    "elements": [
      {
        "id": "e1",
        "label": "食料は算術級数的に増加するとする仮定を説明する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "食料は算術級数的",
                "食料が算術級数的"
              ],
              [
                "増える",
                "増加する",
                "増加し"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "食料は算術級数的"
              ],
              [
                "人口は幾何級数的"
              ],
              [
                "増える"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "食料は幾何級数的",
                "食料が幾何級数的"
              ],
              [
                "増える",
                "増加する"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "ルソー"
              ],
              [
                "食料"
              ],
              [
                "算術級数的"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e2",
        "label": "人口は幾何級数的に増加するとする仮定を説明する。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "人口は幾何級数的",
                "人口が幾何級数的"
              ],
              [
                "増える",
                "増加する",
                "増加し"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "人口は算術級数的",
                "人口が算術級数的"
              ],
              [
                "増える",
                "増加する"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e3",
        "label": "両者の増加の差から、人口増加による貧困化が避けられないとする因果を示す。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "人口増加が",
                "人口の増加が"
              ],
              [
                "食料の増加を上回る"
              ],
              [
                "ため",
                "ので"
              ],
              [
                "貧困"
              ],
              [
                "避けられない",
                "避けられぬ",
                "生じ",
                "起こる"
              ]
            ],
            "max_gap": 20,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "食料の増加"
              ],
              [
                "人口の増加"
              ],
              [
                "上回る"
              ],
              [
                "貧困"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      },
      {
        "id": "e4",
        "label": "解決策として人口の抑制を説いたことを述べる。",
        "points": 2,
        "positive": [
          {
            "sequence": [
              [
                "解決策",
                "対策"
              ],
              [
                "人口の抑制"
              ],
              [
                "主張",
                "説い",
                "求め"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          },
          {
            "sequence": [
              [
                "解決策",
                "対策"
              ],
              [
                "人口増加を抑制"
              ],
              [
                "主張",
                "説い",
                "求め"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ],
        "negative": [
          {
            "sequence": [
              [
                "解決策"
              ],
              [
                "人口の増加"
              ],
              [
                "主張"
              ]
            ],
            "max_gap": 24,
            "scope": "sentence"
          }
        ]
      }
    ],
    "allowed_negation_phrases": [
      "避けられない",
      "避けられぬ"
    ],
    "caution_patterns": [
      {
        "sequence": [
          [
            "ルソー",
            "アダム=スミス",
            "リカード"
          ],
          [
            "人口論",
            "食料"
          ]
        ],
        "max_gap": 50,
        "scope": "answer"
      }
    ]
  }
]

export function getEssayRuleProfile(id: string, version?: number): EssayScoringProfile | undefined {
  return essayRuleProfiles.find(profile => profile.id === id && (version === undefined || profile.version === version))
}
