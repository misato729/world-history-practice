# 本文保持・お気に入り位置・記述難度の追加変更

実確認日: 2026-10-27（UTC）。対象は通常ローカル環境。コミット・push・デプロイ・本番確認は未実施。

## 完了内容

- 同一教材の設問間では共通本文コンポーネントと開閉状態を保持し、設問部分だけを読み込み表示へ切り替える。別本文/改訂内容は更新し、認証・利用条件・絞り込みの世代と遅延応答を検査する。設問切替のページ先頭への移動はNuxt既定動作を維持する。
- お気に入りを`question-classification`の右上へ置き、分類の文量・文化史表示・読み込み中による位置移動を解消した。本文と設問の最大900px・1列を維持する。
- ユーザーの難度指定で語句記述2問を改訂。確認版用語集の①②又は見出し語ではない説明文内語句など、再生に難度のある語を採る基準と、説明文の掲載/独立見出しの有無を分ける確認手順をAGENTS.mdへ記録した。

## 確認したこと

フロント97件（失敗/スキップ0）、本文保持改修の型検査と隔離コピーの本番用ビルド、最終2SFCのscript/template検査が成功。型/build後のお気に入り変更はtemplate/CSSだけでscriptの完全一致も検査した。初回のAPI汎用型の再帰エラーは質問専用型への限定で修正し、最終テストの既存HTTPSポート検査1件は制限環境での失敗ログを保持して必要な実行条件で再確認した。重い検証は並行実行していない。

通常ローカル実APIのPC1440/SP390/320で本文保持・A/B切替・先頭移動・参照・入力/採点、分類右のお気に入りと案内開閉を確認。4問×3幅の星の位置差は各幅内で0px、分類との間隔10px、横はみ出しなし。GET専用の検証プロキシによる2.5秒遅延・合成403は実サービスのエラー確認と区別し、読み込み中の本文/位置保持と失敗時破棄、連続操作後の旧応答拒否を確認した。2→3の設問API1回、catalog追加0回。

本文保持は表示状態の保持である。設問APIは共通本文を含む既存DTOを取得し、同じ本文なら同じ配列・コンポーネントを再利用する。認証・条件世代の判定は単体と独立コードレビューで確認し、実アカウントの新規作成・変更はしていない。

記述2問の頻度・全手掛かり・解説・表記・一意性は原画像と独立担当が確認。ID8/11だけを共通Writerの同一トランザクションで更新し、問題ID/回答形式/公開ロック/作成日時/論理参照を保持。本文A/B・他6問・24選択肢・利用者等は不変、内容版/編集版各+1、反復保存の全snapshot一致。実APIの3正答表記・誤答・字種・旧版409・回答前秘匿・回答後出典一致と実画面の採点も成功。通常DBの利用者/履歴/お気に入り等は各0→0。内部参照行IDの2件再採番は既存Writer動作として事前に許容し、論理参照と対象外行の不変を別検査した。

原稿と旧承認期待値は上書きせず、新しい根拠を別保存。旧reasonの『農政全書に独立見出しがない』との説明は誤りであり、原画像80の独立見出し⑥の確認を新記録で訂正した。旧版・日本語『詳説世界史』・実測難易度は未確認。サーバー実装の変更、seed/import、通常DBへの復元、コミット/push/外部公開は行っていない。

詳細な結果は[表示保持の検証](../local-only/persistent-passage-20261027/verification.md)、[位置固定の検証](../local-only/favorite-position-20261027/verification.md)、[記述改訂の検証](../local-only/difficult-short-answer-20261027/verification.md)。原資料・照合画像・DB控えはローカル専用で、送信・Dockerビルド対象外。

## 今回変更した正規ファイル

開始前からあった大問機能等の未コミット差分は、本一覧の新規変更として数えない。演習ページ/AGENTS/設計・検証・文脈・進捗文書は既存差分へ今回分を追加した。既存の「 2」コピーは変更していない。

- [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/[examNumber]/[questionNumber].vue): 同教材のページ再利用、本文保持、設問読み込みと応答世代の判定、お気に入り配置。
- [frontend/app/components/SharedPassagePanel.vue](../frontend/app/components/SharedPassagePanel.vue): 新規。共通本文と開閉状態、明示参照の移動を独立。
- [frontend/app/utils/practicePassageState.ts](../frontend/app/utils/practicePassageState.ts): 新規。同本文の参照再利用、保持範囲と応答タグを判定。
- [frontend/tests/practicePassageState.test.ts](../frontend/tests/practicePassageState.test.ts): 新規。本文同一性/公開範囲/認証・条件世代/旧応答拒否の6件。
- [AGENTS.md](../AGENTS.md): 語句記述の選定基準と見出し有無の確認手順。
- [docs/grouped-question-design-20261027.md](grouped-question-design-20261027.md): 直列表示に加え、本文保持・先頭移動・お気に入り固定の設計。
- [docs/verification.md](verification.md): 今回の実測・検査・内容改訂と検証範囲を追補。
- [docs/workflow/contexts/product.md](workflow/contexts/product.md): 新しい記述基準と改訂稿への参照、現在の8問と全セットの区別。
- [docs/workflow/contexts/service.md](workflow/contexts/service.md): 現在の実装/ローカルDBと検証境界。
- [docs/workflow/state.json](workflow/state.json): 3タスクの受入条件・評価・実確認範囲を記録。
- [docs/interaction-and-content-update-20261027.md](interaction-and-content-update-20261027.md): 本記録とファイル一覧。

## ローカル専用の作成ファイル

以下は今回の新しい照合/検証/復旧用記録。原画像・DB控えは送信しない。依存ライブラリへのリンクと型/buildの一時生成物は成果物一覧から除く。自動生成の不変checkpointは`state.json`の評価記録と`last_checkpoint`から参照する。

- [local-only/persistent-passage-20261027/before-practice.vue](../local-only/persistent-passage-20261027/before-practice.vue): 差分確認の開始前コピー。
- [local-only/persistent-passage-20261027/build.log](../local-only/persistent-passage-20261027/build.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/different-passage-final.json](../local-only/persistent-passage-20261027/different-passage-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/forbidden-final.json](../local-only/persistent-passage-20261027/forbidden-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/frontend-tests-final.log](../local-only/persistent-passage-20261027/frontend-tests-final.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/frontend-tests-restricted.log](../local-only/persistent-passage-20261027/frontend-tests-restricted.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/frontend-tests.log](../local-only/persistent-passage-20261027/frontend-tests.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/live-retention-final.json](../local-only/persistent-passage-20261027/live-retention-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/pending-desktop.jpg](../local-only/persistent-passage-20261027/pending-desktop.jpg): 照合用原画像又は検証画面。
- [local-only/persistent-passage-20261027/pending-final-desktop.jpg](../local-only/persistent-passage-20261027/pending-final-desktop.jpg): 照合用原画像又は検証画面。
- [local-only/persistent-passage-20261027/pending-final.json](../local-only/persistent-passage-20261027/pending-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/pending-mobile-final.jpg](../local-only/persistent-passage-20261027/pending-mobile-final.jpg): 照合用原画像又は検証画面。
- [local-only/persistent-passage-20261027/pending-mobile-final.json](../local-only/persistent-passage-20261027/pending-mobile-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/pending.json](../local-only/persistent-passage-20261027/pending.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/proxy.log](../local-only/persistent-passage-20261027/proxy.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/rapid-final.json](../local-only/persistent-passage-20261027/rapid-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/request-count-final.json](../local-only/persistent-passage-20261027/request-count-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/requests-after.json](../local-only/persistent-passage-20261027/requests-after.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/requests-before.json](../local-only/persistent-passage-20261027/requests-before.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/requests-final-after.json](../local-only/persistent-passage-20261027/requests-final-after.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/requests-final-before.json](../local-only/persistent-passage-20261027/requests-final-before.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/review.md](../local-only/persistent-passage-20261027/review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/persistent-passage-20261027/same-passage-final.json](../local-only/persistent-passage-20261027/same-passage-final.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/same-passage.json](../local-only/persistent-passage-20261027/same-passage.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/persistent-passage-20261027/typecheck.log](../local-only/persistent-passage-20261027/typecheck.log): 実行した検査のログ。
- [local-only/persistent-passage-20261027/verification-proxy.mjs](../local-only/persistent-passage-20261027/verification-proxy.mjs): 今回の限定操作又は検査の再現用。
- [local-only/persistent-passage-20261027/verification.md](../local-only/persistent-passage-20261027/verification.md): 個別の根拠・レビュー又は検証記録。
- [local-only/persistent-passage-20261027/workflow-start.log](../local-only/persistent-passage-20261027/workflow-start.log): 実行した検査のログ。
- [local-only/favorite-position-20261027/before-practice.vue](../local-only/favorite-position-20261027/before-practice.vue): 差分確認の開始前コピー。
- [local-only/favorite-position-20261027/checks.json](../local-only/favorite-position-20261027/checks.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/favorite-position-20261027/header-desktop.jpg](../local-only/favorite-position-20261027/header-desktop.jpg): 照合用原画像又は検証画面。
- [local-only/favorite-position-20261027/layout-1440.jpg](../local-only/favorite-position-20261027/layout-1440.jpg): 照合用原画像又は検証画面。
- [local-only/favorite-position-20261027/layout-320.jpg](../local-only/favorite-position-20261027/layout-320.jpg): 照合用原画像又は検証画面。
- [local-only/favorite-position-20261027/layout-390.jpg](../local-only/favorite-position-20261027/layout-390.jpg): 照合用原画像又は検証画面。
- [local-only/favorite-position-20261027/measurements.json](../local-only/favorite-position-20261027/measurements.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/favorite-position-20261027/pending-1440.jpg](../local-only/favorite-position-20261027/pending-1440.jpg): 照合用原画像又は検証画面。
- [local-only/favorite-position-20261027/pending.json](../local-only/favorite-position-20261027/pending.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/favorite-position-20261027/review.md](../local-only/favorite-position-20261027/review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/favorite-position-20261027/sfc-check.log](../local-only/favorite-position-20261027/sfc-check.log): 実行した検査のログ。
- [local-only/favorite-position-20261027/verification.md](../local-only/favorite-position-20261027/verification.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/after-transaction.json](../local-only/difficult-short-answer-20261027/after-transaction.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/after-ui-check.json](../local-only/difficult-short-answer-20261027/after-ui-check.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/after-ui-state.json](../local-only/difficult-short-answer-20261027/after-ui-state.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/answer-q3-mobile.jpg](../local-only/difficult-short-answer-20261027/answer-q3-mobile.jpg): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/answer-q6-mobile.jpg](../local-only/difficult-short-answer-20261027/answer-q6-mobile.jpg): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/before-state.json](../local-only/difficult-short-answer-20261027/before-state.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/before-transaction.json](../local-only/difficult-short-answer-20261027/before-transaction.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/before-versions.json](../local-only/difficult-short-answer-20261027/before-versions.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/before.dump](../local-only/difficult-short-answer-20261027/before.dump): 更新前DBの復旧控え（0600）。
- [local-only/difficult-short-answer-20261027/config-check.log](../local-only/difficult-short-answer-20261027/config-check.log): 実行した検査のログ。
- [local-only/difficult-short-answer-20261027/db-review.md](../local-only/difficult-short-answer-20261027/db-review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/generate.py](../local-only/difficult-short-answer-20261027/generate.py): 今回の限定操作又は検査の再現用。
- [local-only/difficult-short-answer-20261027/http-check.json](../local-only/difficult-short-answer-20261027/http-check.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/http-check.mjs](../local-only/difficult-short-answer-20261027/http-check.mjs): 今回の限定操作又は検査の再現用。
- [local-only/difficult-short-answer-20261027/independent-review.md](../local-only/difficult-short-answer-20261027/independent-review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/patches.json](../local-only/difficult-short-answer-20261027/patches.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/private-check.log](../local-only/difficult-short-answer-20261027/private-check.log): 実行した検査のログ。
- [local-only/difficult-short-answer-20261027/q3-glossary-080-frequency.png](../local-only/difficult-short-answer-20261027/q3-glossary-080-frequency.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q3-glossary-080.png](../local-only/difficult-short-answer-20261027/q3-glossary-080.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q3-glossary-090.png](../local-only/difficult-short-answer-20261027/q3-glossary-090.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q3-glossary-143-entry.png](../local-only/difficult-short-answer-20261027/q3-glossary-143-entry.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q3-glossary-143.png](../local-only/difficult-short-answer-20261027/q3-glossary-143.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q3-source-review.md](../local-only/difficult-short-answer-20261027/q3-source-review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/q6-glossary-013.png](../local-only/difficult-short-answer-20261027/q6-glossary-013.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q6-glossary-020.png](../local-only/difficult-short-answer-20261027/q6-glossary-020.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q6-glossary-071-detail.png](../local-only/difficult-short-answer-20261027/q6-glossary-071-detail.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q6-glossary-071.png](../local-only/difficult-short-answer-20261027/q6-glossary-071.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q6-glossary-074.png](../local-only/difficult-short-answer-20261027/q6-glossary-074.png): 照合用原画像又は検証画面。
- [local-only/difficult-short-answer-20261027/q6-source-review.md](../local-only/difficult-short-answer-20261027/q6-source-review.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/repeated-transaction.json](../local-only/difficult-short-answer-20261027/repeated-transaction.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/run-update.mjs](../local-only/difficult-short-answer-20261027/run-update.mjs): 今回の限定操作又は検査の再現用。
- [local-only/difficult-short-answer-20261027/snapshot.mjs](../local-only/difficult-short-answer-20261027/snapshot.mjs): 今回の限定操作又は検査の再現用。
- [local-only/difficult-short-answer-20261027/update-operation.mjs](../local-only/difficult-short-answer-20261027/update-operation.mjs): 今回の限定操作又は検査の再現用。
- [local-only/difficult-short-answer-20261027/update-result.json](../local-only/difficult-short-answer-20261027/update-result.json): 比較用の入力・状態・件数又は実測結果。
- [local-only/difficult-short-answer-20261027/verification.md](../local-only/difficult-short-answer-20261027/verification.md): 個別の根拠・レビュー又は検証記録。
- [local-only/difficult-short-answer-20261027/workflow-before-final.log](../local-only/difficult-short-answer-20261027/workflow-before-final.log): 実行した検査のログ。
- [local-only/difficult-short-answer-20261027/問題と解説.md](../local-only/difficult-short-answer-20261027/問題と解説.md): 個別の根拠・レビュー又は検証記録。
