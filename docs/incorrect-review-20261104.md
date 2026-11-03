# 間違えた問題の復習（2026-11-04）

情報教認の現行ソースを参照。最新解答が不正解の、現在公開/利用可能な本人の問題だけを毎回ランダム順で復習。正解で次の対象から除外し、再び不正解なら再登録。履歴は保持。本文/正答を一覧APIへ含めない。両ラボは現行内容版・回答形式を照合し論述のnullを不正解にしない。疎な模試/問番号の組を維持し、一周の途中で正解してもその周回を崩さない。ログアウト/資格変更/遅延応答の混入を防ぐ。

実装/検証中。送信・本番変更は今回未依頼。

初回独立レビューで、日本史の復習中カタログ待機、テンプレートの別セッションへの採点遅延混入、履歴入口の0件通知不足を検出。質問取得の開始条件を正しいuseFetchへ移し、採点の所有者/URL/問題を照合して古い結果とエラーを破棄し、0件通知を追加した。修正後に再評価する。

## 検証結果

- 世界史658件・日本史251件・テンプレート149件のフロント回帰検査が全成功。匿名表示の検査を追加後、各リポジトリの復習関連6件を再実行して全成功。
- 修正後の3リポジトリのNuxt型検査が成功。
- 専用の使い捨てPostgreSQLで各1件のSQL境界検査をskipなし実施。本人/他人、最新解答の日時/ID順、正解で除外・再不正解で復帰、公開・非公開、資格、重複なし、返却フィールドを確認。両ラボでは現内容版/形式、セット/大問の公開も確認。通常DB・本番DBは使わず、検証DBは停止・削除済み。
- 実Nuxtの独立コピーと合成API/合成認証でPC1280/SP390を操作。初期2問、異なる模試の正確な巡回、正解→次の周回で除外、残り1問の再復習→全問正解、履歴入口の0件通知を3つとも確認。世界史は既存attemptの保存・再読込・終了・結果へ接続、日本史/テンプレートは再読み込み時に最新対象から再構築。本文/回答のAPIや認証を本番で操作した確認ではない。
- 世界史の匿名トップ/復習タブは問題API・復習APIの回数が増えないことを合成APIカウンターで確認。テンプレートはタブ選択前に復習API0件も確認。全3つの単体検査で匿名取得なし、旧ユーザー/セッション/資格の遅延応答破棄を確認。
- スマートフォンの3タブはアイコンと文言を縦配置にして読みやすく調整。ページ幅390pxに一致、操作要素の重なり/横はみ出しなし。
- 独立コードレビューincorrect_review_audit PASS（初回指摘と修正は上記）。最終画像レビューもPASS。PC/SP入口6画像とSP復習結果3画像で重なり・はみ出しがないことを別担当が確認した。

## 適用範囲

実装とローカル検証のみ。コミット・push・本番反映は今回行っていない。DBスキーマ/適用済みマイグレーション・既存解答履歴を変更しない。情報教認は参照のみで変更なし。世界史の別件Stripe記録と既存ロックを保持。

証跡は`local-only/incorrect-review-20261104/`へ保管し、Git/Dockerの送信対象にはしない。合成画面で使った問題番号は各リポジトリの設定内に合わせる。

## 今回の変更ファイル

- [AGENTS.md](../AGENTS.md)：復習対象と認証・周回の保護基準。
- [docs/incorrect-review-20261104.md](../docs/incorrect-review-20261104.md)：仕様・検証・変更一覧と進捗の記録。
- [docs/workflow/state.json](../docs/workflow/state.json)：進捗と受入条件・評価の記録。
- [frontend/app/components/IncorrectReviewPanel.vue](../frontend/app/components/IncorrectReviewPanel.vue)：ログイン・取得中・失敗・0件・開始の表示。
- [frontend/app/components/IncorrectReviewCompletion.vue](../frontend/app/components/IncorrectReviewCompletion.vue)：残り件数・再復習・全問正解の表示。
- [frontend/app/composables/useIncorrectReview.ts](../frontend/app/composables/useIncorrectReview.ts)：認証別キャッシュと固定周回、再取得・開始。
- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：間違えた問題タブとモバイル表示。
- [frontend/app/pages/history.vue](../frontend/app/pages/history.vue)：復習入口と0件通知。
- [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/[examNumber]/[questionNumber].vue)：復習巡回、回答後の対象更新、認証変更時の保護。
- [frontend/app/utils/practiceSequence.ts](../frontend/app/utils/practiceSequence.ts)：疎な問題の組を保持する安定ランダム順。
- [frontend/server/services/incorrect-review.ts](../frontend/server/services/incorrect-review.ts)：本人の最新不正解と公開・資格を検査する一覧API。
- [frontend/server-tests/incorrect-review.test.ts](../frontend/server-tests/incorrect-review.test.ts)：隔離PostgreSQLによる対象集計・境界検査。
- [frontend/tests/incorrectReview.test.ts](../frontend/tests/incorrectReview.test.ts)：ランダム順・キャッシュ・認証競合・匿名の回帰検査。
- [frontend/app/pages/practice/results/[attemptId].vue](../frontend/app/pages/practice/results/[attemptId].vue)：演習結果に残った問題の再復習を追加。
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/[...path].ts)：既存認証付きのAPI振り分け。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)：仕様・検証・変更一覧と進捗の記録。

- [docs/workflow/handoffs/2026-11-03T22-36-57-608Z-r322.json](../docs/workflow/handoffs/2026-11-03T22-36-57-608Z-r322.json)：初回指摘・修正後の合格・完了の引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T22-36-59-158Z-r323.json](../docs/workflow/handoffs/2026-11-03T22-36-59-158Z-r323.json)：初回指摘・修正後の合格・完了の引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T22-38-43-869Z-r324.json](../docs/workflow/handoffs/2026-11-03T22-38-43-869Z-r324.json)：初回指摘・修正後の合格・完了の引き継ぎ記録。

## 追加依頼による送信・公開完了

上記の未送信・未公開は実装時点の記録。2026-11-04の追加依頼によりcommit/pushとCI確認を完了。世界史・日本史はFly/Netlify反映、ログイン後の0件表示と履歴入口、PC/SPを本番確認した。[公開結果と確認範囲](incorrect-review-release-20261104.md)を参照。
