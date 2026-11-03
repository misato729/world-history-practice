# 復習機能の送信・本番反映（2026-11-04）

情報教認と同じ「本人の最新解答が不正解の問題をランダムに復習し、正解した問題を次の周回から除外する」機能を送信した。ユーザーの依頼は3リポジトリのcommit/push、世界史・日本史の本番反映とCI・本番動作確認。テンプレートは送信のみ。

## コミットとCI

- 実装SHA: `72679a49daa1fb2e10942106e755d5c6a28663c2`。origin/mainとの一致を送信後に確認。
- [CI結果](https://github.com/misato729/world-history-practice/actions/runs/41739834928) は `harness, verify` が全成功。
- 送信前に実装ファイルの原作業場所との一致、stageの限定、資料保護検査、書式検査を確認し、独立レビューPASS。世界史の別件Stripe記録を除外・保持した。
- APIより画面が先に公開されないよう実装コミットには`[skip netlify]`を使用。後続の記録だけのコミットは`[skip netlify] [skip ci]`を使用し、公開済み実装SHAを維持する。

## 本番反映と確認

- Fly.io `world-history-practice`、image `incorrect-72679a49da` を既存2VMへrolling反映。VM ID・env・注入ファイル（0件）・guest資源・nrt配置の保持を比較して確認。
- 既存release commandの`db:migrate`が成功。今回DBスキーマ/マイグレーションの追加はなく、問題・利用者・回答履歴への手動書込やseed再投入は行っていない。
- Netlify deploy `6aea70b9c6697dc0e0a81769` はready/published、commit_refが実装SHAと一致。[本番サイト](https://world-history-practice.netlify.app/)。
- 復習APIの匿名GET/HEADは401、Cache-Controlはno-store。世界史のフロントが使用するFlyのAPIで確認。
- ユーザーがログインした実本番アカウントで、トップの「間違えた問題」タブと取得後の0件表示、解答履歴の復習ボタンと「現在、復習する問題はありません。」の通知を実操作で確認。ログイン値・個人情報・回答内容は記録しない。
- PC1280px/SP390pxの実画面でページ幅の一致、3タブ・復習パネルの重なり/横はみ出しなしを確認。4画像・安全な設定保全証跡・CI・APIを独立担当がレビューしPASS。
- 配信用一時ソース、秘密設定・注入ファイルの控え、配信ログは確認後に削除した。原資料をGit/ビルド対象へ含めていない。

## 確認範囲の限界

両本番アカウントは復習対象0件だった。履歴を増やす試験は行っておらず、本番での回答保存・正解後の除外・次の周回は未試験。これらの一連の動作は、[実装検証](incorrect-review-20261104.md)にある隔離PostgreSQL検査と実Nuxt＋合成API/合成認証のPC/SP操作で確認済み。本番で全周回を検証した結果と混同しない。

既存の確認タブで選択が反映されない場面があったため、新しいタブでメニュー開閉・復習タブ・履歴導線を確認し直した。最終画像は新しいタブでの確認結果。追加のソース修正は行っていない。

[実装・ローカル検証と変更一覧](incorrect-review-20261104.md)。今回の公開記録は本ファイル、進捗・文脈カード・新しい引き継ぎにも反映する。安全な証跡と画像は`local-only/incorrect-review-release-20261104/`に保持し、送信しない。

## 今回送信した全変更ファイル

- [AGENTS.md](../AGENTS.md)：復習対象とデータ保護の基準。
- [docs/incorrect-review-20261104.md](../docs/incorrect-review-20261104.md)：仕様・検証・公開結果と変更一覧。
- [docs/incorrect-review-release-20261104.md](../docs/incorrect-review-release-20261104.md)：仕様・検証・公開結果と変更一覧。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)：仕様・検証・公開結果と変更一覧。
- [docs/workflow/handoffs/2026-11-03T22-36-57-608Z-r322.json](../docs/workflow/handoffs/2026-11-03T22-36-57-608Z-r322.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T22-36-59-158Z-r323.json](../docs/workflow/handoffs/2026-11-03T22-36-59-158Z-r323.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T22-38-43-869Z-r324.json](../docs/workflow/handoffs/2026-11-03T22-38-43-869Z-r324.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T23-29-37-914Z-r325.json](../docs/workflow/handoffs/2026-11-03T23-29-37-914Z-r325.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T23-48-17-275Z-r326.json](../docs/workflow/handoffs/2026-11-03T23-48-17-275Z-r326.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T23-48-17-878Z-r327.json](../docs/workflow/handoffs/2026-11-03T23-48-17-878Z-r327.json)：区切りごとの引き継ぎ記録。
- [docs/workflow/state.json](../docs/workflow/state.json)：実装/送信/公開の進捗と評価。
- [frontend/app/components/IncorrectReviewCompletion.vue](../frontend/app/components/IncorrectReviewCompletion.vue)：残り件数と再復習・全問正解の表示。
- [frontend/app/components/IncorrectReviewPanel.vue](../frontend/app/components/IncorrectReviewPanel.vue)：開始・取得・失敗・0件の表示。
- [frontend/app/composables/useIncorrectReview.ts](../frontend/app/composables/useIncorrectReview.ts)：最新対象取得・キャッシュ・固定周回と開始。
- [frontend/app/pages/history.vue](../frontend/app/pages/history.vue)：履歴からの復習入口と0件通知。
- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：復習タブと端末幅対応。
- [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/[examNumber]/[questionNumber].vue)：復習巡回と認証・採点遅延の保護。
- [frontend/app/pages/practice/results/[attemptId].vue](../frontend/app/pages/practice/results/[attemptId].vue)：演習結果からの残り問題の再復習。
- [frontend/app/utils/practiceSequence.ts](../frontend/app/utils/practiceSequence.ts)：疎な問題の組を保つ安定ランダム順。
- [frontend/server-tests/incorrect-review.test.ts](../frontend/server-tests/incorrect-review.test.ts)：隔離PostgreSQLの境界検査。
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/[...path].ts)：既存認証付きのAPI振り分け。
- [frontend/server/services/incorrect-review.ts](../frontend/server/services/incorrect-review.ts)：本人の最新不正解・公開/資格の一覧API。
- [frontend/tests/incorrectReview.test.ts](../frontend/tests/incorrectReview.test.ts)：ランダム順・認証競合・匿名取得の回帰検査。
