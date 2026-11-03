# マイページの学習マップ

2026-11-03依頼。世界史ラボのローカル実装。コミット・push・本番変更は未依頼。
添付画面・HTMLは機能理解だけの参考とし、第三者のコード・画像は組み込まない。追加依頼に合わせ、文言・配色・シンボルを独自化した。

## 現行仕様

- `/account`に学習マップを追加。専用の `GET /api/v1/me/achievement` を取得する。既存サイドバーの静的ページでの問題API抑止を維持。
- 独自の地図SVG、状態別の6種類のアイコンを使用。参考画面の見出し、トロフィー、金銀銅の表現は使わない。サイト全体の既存ロゴや既存のアカウント設定文言は維持。
- 記号は未回答＝横線（ハイフン）、前回不正解＝×、重点復習＝丸囲み×。存在しない問題のセルは空欄（読み上げは保持）。表と凡例で同一定義を使用。
- 状態名は「安定して正解」「前回は正解」「前回は不正解」「重点的に復習」「未回答」「論述の記録」。緑・青緑・橙・赤紫・灰・紫で区別し、色以外にアイコン形状・凡例・読み上げ名を用意。
- 「安定して正解」は直近2回とも正解、「重点的に復習」は直近2回とも不正解。他の正誤2区分は最新結果を使う。履歴なしと論述の参考採点は別表示。
- 本人の同じ問題・同じ内容バージョン・回答形式の直近2履歴を使用。回答日時降順、同時刻は履歴ID降順。履歴のない公開問題も一覧に含む。
- 現在利用できる公開問題のみを分母とする。無料会員は有料模試を除外し、その旨を表示。非公開のセット・大問・問題、設定範囲外の模試を含めない。解答済みの「取り組み率」は正答率と区別。
- 横軸は模試内の実出題順。読み上げ・ツールチップで大問/小問を案内し、リンクは実際の内部番号を保持。模試に存在しない列は対象外表示。
- 各セルは問題を別タブで開く。状態を選んで対象問題だけを順に復習できる。開始直前にレポートを再取得し、既存の演習APIでも資格・公開状態を再検査する。500問超は絞り込みを案内。
- APIは本文・解説・出典・選択肢・提出答案・他人の履歴を返さない。匿名は401、応答はno-store。参照だけではDBの既存内容・履歴を変更しない。DBマイグレーションなし。
- 認証/利用資格の変更・ページ離脱後の古い応答を捨て、旧表示を消去。通信失敗と0問を区別し、再試行できる。

## 検証

合成データだけを入れた使い捨ての `world_achievement_test` を使用。本番DB、実問題、実ユーザー、Stripe、販売設定は操作していない。

- 新規の単体テスト5件成功：状態判定、匿名の無取得、認証切替時の古い応答破棄、利用資格変更/同一ユーザー再認証、通信失敗からの再試行と0件。
- 関連する認証・静的サイドバー等を含む単体40件成功。静的ページのサイドバーが問題APIを呼ばない既存条件も通過。
- 新規隔離PostgreSQL/APIテスト3件成功（スキップなし）：本人/現行版の最新2回・同時刻ID順、セット/大問/小問の公開状態と資格失効、HTTP401/200/404とno-store。レポートを再取得しても同一であることを確認。
- Nuxt型検査成功。変更後の最終検査も同じNode24環境で実行。
- 実ブラウザー、PC1280×900/SP390×844。無料ユーザーは30/37問・81.1%、全問題利用可能な管理者は34/42問・81.0%。有料模試6は前者の行と分母から除外、後者には表示。
- 状態選択に応じた件数とマスの強調、セルの別タブ生成、横スクロール、ログアウト後の非表示、別ユーザーの再ログイン、既存設定の併存を操作確認。
- 無料ユーザーの「重点的に復習」7問が問題4の1/7で開始。管理者の同状態8問も問題4の1/8から問題9の2/8へ進み、非対象問題を飛ばすことを確認。
- 表内の読み上げ補助要素がスクロール領域外へ影響しないよう、表のラッパーを位置指定の基準にした。修正後のdocument幅はPC1280/SP390で各ビューポートと一致。
- PC画像 `/tmp/learning-map-pc-20261103.png`、SP画像 `/tmp/learning-map-sp-20261103.png`、SP表画像 `/tmp/learning-map-sp-table-20261103.png`。すべて合成データで、Git対象外の一時成果物。
- 独立担当 `achievement_review` がコード/改訂デザイン/論述fixtureを読取レビューしPASS。旧配色が残った説明文の指摘は本仕様へ統合して解消。
- `git diff --check`、ローカル専用資料保護検査は成功。進捗check/gateも成功（改訂タスクの完了世代301）。コミット、push、CI、本番配信は未実施。

## 初期検証の失敗と仕様改訂

旧タスク `achievement_report_20261103` は3回の評価失敗を消さず保持している。いずれも合成fixtureと現行入力/DB制約の不一致で、実装側の制約は緩和していない。

1. 公開用の合成問題に必須出典がなかったため、架空書誌を追加。
2. 既定5問上限に対して7問を作っていた点と、従来形式Writerがセットを自動公開する点を修正。テスト内のみ30問設定を使い、非公開条件を保存後に明示した。
3. 論述合成履歴に必須のessay_resultがなかった点を独立レビューで指摘。現行DB制約を確認しpendingの参考採点オブジェクトを追加。

その後のユーザーによる「文言・色・ロゴを変更」の追加依頼を受け、独自デザインの新仕様を `learning_map_20261103` に分けて検証した。旧記録の消去や評価上限の増加はしていない。

## 今回の変更ファイル

着手前からのStripeタイトル関連の3引き継ぎと単独レポートは今回の変更対象ではない。共有state/serviceカードはその既存記録を保持して今回分を追記。以下19ファイル。

検証用ブラウザーはログアウトして閉じ、表示サイズの変更を解除した。専用Nuxtサーバーを停止し、今回作成した使い捨てDBコンテナを削除した。実際のローカルDBと既存サービスは操作していない。

| ファイル | 変更内容 |
| --- | --- |
| [frontend/app/pages/account.vue](../frontend/app/pages/account.vue) | マイページへ学習マップを組み込み |
| [frontend/app/components/AchievementReport.vue](../frontend/app/components/AchievementReport.vue) | 独自の文言・シンボル・配色、問題別表と状態別復習、PC/SP対応 |
| [frontend/app/composables/useAchievementReport.ts](../frontend/app/composables/useAchievementReport.ts) | 専用取得、再試行と認証/資格変更時の応答制御 |
| [frontend/shared/types/achievement.ts](../frontend/shared/types/achievement.ts) | 最小のレポートAPI型 |
| [frontend/shared/achievement.ts](../frontend/shared/achievement.ts) | 直近2回の状態判定と独自ラベル |
| [frontend/server/services/achievement.ts](../frontend/server/services/achievement.ts) | 本人・公開状態・利用資格に沿う集計専用API |
| [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/[...path].ts) | 集計ハンドラーの登録 |
| [frontend/tests/achievement.test.ts](../frontend/tests/achievement.test.ts) | 状態判定/匿名/認証切替/失敗の単体検証 |
| [frontend/server-tests/achievement.test.ts](../frontend/server-tests/achievement.test.ts) | 隔離DBとHTTPでの認証/資格/公開状態/履歴集計検証 |
| [docs/achievement-report-20261103.md](achievement-report-20261103.md) | 本仕様・検証・ファイル一覧 |
| [docs/workflow/contexts/service.md](workflow/contexts/service.md) | 既存の記録を保ったまま今回の実装と検証を追記 |
| [docs/workflow/state.json](workflow/state.json) | 旧評価の失敗記録とユーザー追加依頼の改訂タスク完了を記録 |
| [docs/workflow/handoffs/2026-11-03T08-59-09-823Z-r295.json](workflow/handoffs/2026-11-03T08-59-09-823Z-r295.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-04-30-978Z-r296.json](workflow/handoffs/2026-11-03T09-04-30-978Z-r296.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-05-38-955Z-r297.json](workflow/handoffs/2026-11-03T09-05-38-955Z-r297.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-07-52-619Z-r298.json](workflow/handoffs/2026-11-03T09-07-52-619Z-r298.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-07-54-321Z-r299.json](workflow/handoffs/2026-11-03T09-07-54-321Z-r299.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-17-59-956Z-r300.json](workflow/handoffs/2026-11-03T09-17-59-956Z-r300.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |
| [docs/workflow/handoffs/2026-11-03T09-18-04-713Z-r301.json](workflow/handoffs/2026-11-03T09-18-04-713Z-r301.json) | 今回の着手・評価・仕様変更・完了の変更不可の引き継ぎ記録 |

## 追加依頼：未回答の表記

2026-11-03、「これから取り組む」を「未回答」に統一。解答履歴のない問題（パスしただけの問題を含む）が対象。すでに解答履歴のある問題を後の回でパスしても、蓄積済みの達成度はリセットしない。状態キー/判定/履歴は変更せず、選択肢・凡例・読み上げに共有ラベルを反映し、画面補足も統一した。既存単体5件成功、旧文言残存なし、独立レビューPASS、diff検査成功。PC/SPの実操作は前回検証で、今回の文字修正後の再確認はしていない。

今回の追加変更ファイル：`frontend/shared/achievement.ts`（共有ラベル）、`frontend/app/components/AchievementReport.vue`（補足）、この文書、`docs/workflow/contexts/service.md`、`docs/workflow/state.json`、今回の引き継ぎ記録（完了時に追記）。既存の未コミット作業は保持。

追加依頼の引き継ぎ記録：
- [2026-11-03T09-28-42-882Z-r302.json](workflow/handoffs/2026-11-03T09-28-42-882Z-r302.json)：今回の着手/評価/完了記録。
- [2026-11-03T09-29-10-497Z-r303.json](workflow/handoffs/2026-11-03T09-29-10-497Z-r303.json)：今回の着手/評価/完了記録。
- [2026-11-03T09-29-11-744Z-r304.json](workflow/handoffs/2026-11-03T09-29-11-744Z-r304.json)：今回の着手/評価/完了記録。

## 追加依頼：表示記号

2026-11-03、未回答を横線（i-lucide-minus）、前回不正解を×（i-lucide-x）、重点復習を丸囲み×（i-lucide-circle-x）へ変更。存在しない問題のセルは可視記号を除去し空欄にした。読み上げ名・リンク・履歴・状態判定・集計は保持。表と凡例は共通の記号定義を参照する。

既存単体5件成功、記号定義/空欄の確認・diff検査成功、実SFCのブラウザー向け合成プレビューコンパイル成功、独立コードレビューPASS。PC/SPの実表示はブラウザー接続がタイムアウトするため未確認。過去のPC/SP画像は今回の変更後の証跡には使わない。DB起動の応答遅延で準備が停止し、DBなしの実コンポーネント＋合成データ方式へ切り替えたが、ブラウザーも応答しなかった。プレビューサーバーは停止済み。今回作成した一時DBの削除も完了。

今回の変更ファイル：

- [frontend/app/components/AchievementReport.vue](../frontend/app/components/AchievementReport.vue)：記号と空欄の表示変更。
- [docs/achievement-report-20261103.md](achievement-report-20261103.md)：本仕様と確認範囲。
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)：今回の変更と画面再確認待ち。
- [docs/workflow/state.json](workflow/state.json)：追加タスク/検証結果。
- [docs/workflow/handoffs/2026-11-03T09-44-53-612Z-r305.json](workflow/handoffs/2026-11-03T09-44-53-612Z-r305.json)：今回の着手/検証記録。
- [docs/workflow/handoffs/2026-11-03T09-50-02-046Z-r306.json](workflow/handoffs/2026-11-03T09-50-02-046Z-r306.json)：今回の着手/検証記録。

## 公開状況の更新

ユーザーの追加依頼により、実装1470914をmainへ送信しCI成功、Netlify/Flyへ本番反映済み。[公開結果・全変更ファイル](learning-map-release-20261103.md)。上の未配信表記は各作業時点の記録。SP再確認は未完了として保持。

公開後にブラウザー接続が回復し、変更後の実コンポーネント＋合成データでPC/SPの記号・未回答絞り込み・表内横スクロールを再確認。以前の未確認事項は解消。[最終確認](learning-map-release-20261103.md)。本番本人レポートの閲覧は行っていない。
