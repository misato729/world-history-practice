# 模擬試験・大問・小問の表示整理

確認日: 2026年10月27日（UTC）。ユーザーの追加指定により表示/導線を先行し、残り22問の作問は後の作業とした。コミット・push・デプロイは今回未実施。

## 表示と移動

| 場所 | 表示・動作 |
| --- | --- |
| サイドバー親 | 模擬試験n。親リンクはその模擬試験の先頭公開小問へ |
| 親の開閉 | 大問mと大問タイトルを表示。各大問の先頭公開小問へ。小問は列挙しない |
| 本文側h1 | 大問mと大問タイトル |
| 設問欄 | 小問番号を独立見出しにし、入力/回答と本文内の小問移動を維持 |
| 条件指定 | 分野と模擬試験nを選ぶ。小問番号selectorを除去 |
| 順次/ランダム | 選択した模擬試験の全公開小問を対象。分野と順序/seedを継承 |

内部の問題番号・ID・URLとAPIの公開順は変更しない。新規条件URLはexamsを使い、小問のquestionsを生成しない。既存のquestions付きURLは互換を保持する。認証/資格と公開検査は既存どおりAPI側で行う。

現在の通常DBは1大問8小問のまま。カードにも「1大問・8問収録」と表示し、未収録の大問2〜4や22問を補わない。4大問30問を収録した教材では親から全体を解けることを、隔離した合成データで検証した。現在の8問を完成模試へ形式変更していない。

## 検証

- フロント106件、型検査、最終本番用ビルド、3SFC構文が成功。独立担当が全差分と、長い大問名に合わせたCSSの幅配分修正を確認。
- 通常ローカルの実データをPC1440/SP390/320で確認。見出し/階層/実収録数、文字と要素の重なり・横はみ出しなし。星は分類の右上を保ち、各幅内の3設問間で位置差0px。同本文のid/閉状態保持、参照先展開/焦点、入力とゲスト案内も確認。
- 合成専用の末尾_test DBとbuild済みアプリで4大問30問＋別8問を作成。APIで30問全件の取得/採点/正答秘匿、ブラウザで大問境界8→9/15→16/23→24・30問目の終了、sidebarから大問先頭、条件から全30問、ランダム/分野/0件、旧URL、複数模擬試験の31/38への継続を確認。SPで開閉・遷移閉・Escapeと長題名の操作も確認。
- 合成30問は22選択/8短答の機能検証用であり、公式の内訳ではない。サーバーコード無変更のためサーバー全件検査は反復せず、必要な実API確認へ絞った。
- 通常8問/24肢/共通本文/公開状態/ID等と対象外テーブルは前後一致（検証GETのレート制限管理だけを除く）。旧コピー10件のSHAも保持。合成サービス/DBだけを終了時に片付けた。
- 初回PCでは題名末尾1字だけが折り返したため見出し幅を3:2へ修正し再評価。初回失敗は消さず、最終source/build/実画面の一致を確認。全根拠はローカル専用のlocal-only/mock-exam-hierarchy-20261027/verification.mdと各ログ・比較・画像・独立レビュー。

## 配点の参考案

ユーザー訂正案は、選択3点×20問=60点、語句記述3点×8問=24点、論述8点×2問=16点で、計30問・100点。これは参考案として記録し、得点計算や論述採点を追加していない。

日販検定ポータルの[出題形式FAQ](https://faq.kentei-uketsuke.com/faq/detail?category=1902&id=19001013&site=YUMKE0K1)では1級30問、[配点FAQ](https://faq.kentei-uketsuke.com/faq/detail?category=1902&id=19001016&site=YUMKE0K1)では配点非公開と記載される（いずれも更新日2025-03-14、確認日2026-10-27）。この参考案を公式配点として説明しない。

## 変更ファイル

- [frontend/app/components/ExamSidebar.vue](<../frontend/app/components/ExamSidebar.vue>): 模擬試験→公開大問の開閉、先頭リンク/所属active、長題名/0件対応。
- [frontend/app/utils/examCatalog.ts](<../frontend/app/utils/examCatalog.ts>): 親/大問表示名と先頭・公開大問・所属の判定。
- [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](<../frontend/app/pages/practice/[examNumber]/[questionNumber].vue>): h1と小問番号の分離、全小問対象/旧URL互換、見出し幅配分。
- [frontend/app/utils/practiceSequence.ts](<../frontend/app/utils/practiceSequence.ts>): 小問絞り込みを省略した全公開位置の選択。
- [frontend/app/pages/index.vue](<../frontend/app/pages/index.vue>): 模擬試験の表示/条件、新規URLから小問指定を除去、実収録数。
- [frontend/tests/catalogExamNavigation.test.ts](<../frontend/tests/catalogExamNavigation.test.ts>): 8問/30問・0件・大問先頭/所属の回帰（新規）。
- [frontend/tests/groupedLearningPresentation.test.ts](<../frontend/tests/groupedLearningPresentation.test.ts>): 4大問30問と旧絞り込み/順序/模擬試験境界の回帰。
- [frontend/tests/examSidebarLayout.test.ts](<../frontend/tests/examSidebarLayout.test.ts>): 階層と長題名/既存PC/SP配置の表示契約。
- [AGENTS.md](<../AGENTS.md>): 一般画面の階層と、遷移完了を待つ検証手順。
- [docs/architecture.md](<architecture.md>): 表示階層と既存URL/公開順の説明。
- [docs/customization.md](<customization.md>): 教材title/大問titleの使い分けと、未収録分を補わない運用。
- [docs/grouped-question-design-20261027.md](<grouped-question-design-20261027.md>): sidebar/h1/条件の確定設計。
- [docs/verification.md](<verification.md>): 今回の実行結果と範囲。
- [docs/workflow/contexts/product.md](<workflow/contexts/product.md>): 階層/作問範囲と配点参考案/一次資料。
- [docs/workflow/contexts/service.md](<workflow/contexts/service.md>): 実装/検証の現在地と未送信の区別。
- [docs/workflow/state.json](<workflow/state.json>): 受入条件/評価/依存関係/完了記録。
- [docs/mock-exam-hierarchy-20261027.md](<mock-exam-hierarchy-20261027.md>): 本記録・全変更ファイル一覧（新規）。
- [docs/workflow/handoffs/2026-10-27T14-26-41-009Z-r72.json](<workflow/handoffs/2026-10-27T14-26-41-009Z-r72.json>): 初回画面評価と調整方針の不変記録（新規）。

最終の評価/終了checkpointはstate.jsonのexecutionとlast_checkpointに列挙する。既存の旧コピー10件、実問題・原資料・DB・設定は今回の変更対象ではない。ローカルの再現用操作/画像/JSON/ログは同名のlocal-only作業ディレクトリに保持し、runtimeの一時生成物を含めて送信しない。

## ローカル専用の根拠ファイル

以下は今回作成した個別の照合/操作/実測記録。原資料や実DBの控えを送信するものではない。依存ライブラリとruntimeの一時生成物は成果物一覧から除く。

- [local-only/mock-exam-hierarchy-20261027/after-state.json](<../local-only/mock-exam-hierarchy-20261027/after-state.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/api-check.json](<../local-only/mock-exam-hierarchy-20261027/api-check.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/api-check.mjs](<../local-only/mock-exam-hierarchy-20261027/api-check.mjs>): 今回だけの隔離検証又は読取確認の再現手順。
- [local-only/mock-exam-hierarchy-20261027/before-index.vue](<../local-only/mock-exam-hierarchy-20261027/before-index.vue>): 変更前の比較控え。
- [local-only/mock-exam-hierarchy-20261027/before-state.json](<../local-only/mock-exam-hierarchy-20261027/before-state.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/boundaries.json](<../local-only/mock-exam-hierarchy-20261027/boundaries.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/build-before-layout.log](<../local-only/mock-exam-hierarchy-20261027/build-before-layout.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/build.log](<../local-only/mock-exam-hierarchy-20261027/build.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/cleanup.log](<../local-only/mock-exam-hierarchy-20261027/cleanup.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/completion.json](<../local-only/mock-exam-hierarchy-20261027/completion.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/compose.ui.yml](<../local-only/mock-exam-hierarchy-20261027/compose.ui.yml>): 今回だけの隔離検証又は読取確認の再現手順。
- [local-only/mock-exam-hierarchy-20261027/condition-widths.json](<../local-only/mock-exam-hierarchy-20261027/condition-widths.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/conditions.json](<../local-only/mock-exam-hierarchy-20261027/conditions.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/config-check.log](<../local-only/mock-exam-hierarchy-20261027/config-check.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/data-audit.md](<../local-only/mock-exam-hierarchy-20261027/data-audit.md>): 個別の検証・評価又は独立レビュー。
- [local-only/mock-exam-hierarchy-20261027/evaluation-1.md](<../local-only/mock-exam-hierarchy-20261027/evaluation-1.md>): 個別の検証・評価又は独立レビュー。
- [local-only/mock-exam-hierarchy-20261027/filters-random.json](<../local-only/mock-exam-hierarchy-20261027/filters-random.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/frontend-tests.log](<../local-only/mock-exam-hierarchy-20261027/frontend-tests.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/hierarchy-header-desktop.jpg](<../local-only/mock-exam-hierarchy-20261027/hierarchy-header-desktop.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/legacy-url.json](<../local-only/mock-exam-hierarchy-20261027/legacy-url.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/live-catalog-summary.json](<../local-only/mock-exam-hierarchy-20261027/live-catalog-summary.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/live-conditions-390.jpg](<../local-only/mock-exam-hierarchy-20261027/live-conditions-390.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-desktop-final.jpg](<../local-only/mock-exam-hierarchy-20261027/live-desktop-final.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-desktop.jpg](<../local-only/mock-exam-hierarchy-20261027/live-desktop.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-hierarchy.json](<../local-only/mock-exam-hierarchy-20261027/live-hierarchy.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/live-interactions.json](<../local-only/mock-exam-hierarchy-20261027/live-interactions.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/live-measurements.json](<../local-only/mock-exam-hierarchy-20261027/live-measurements.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/live-mobile-menu-320.jpg](<../local-only/mock-exam-hierarchy-20261027/live-mobile-menu-320.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-practice-1440-final.jpg](<../local-only/mock-exam-hierarchy-20261027/live-practice-1440-final.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-practice-320-final.jpg](<../local-only/mock-exam-hierarchy-20261027/live-practice-320-final.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/live-practice-390-final.jpg](<../local-only/mock-exam-hierarchy-20261027/live-practice-390-final.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/mobile.json](<../local-only/mock-exam-hierarchy-20261027/mobile.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/normal-snapshot.mjs](<../local-only/mock-exam-hierarchy-20261027/normal-snapshot.mjs>): 今回だけの隔離検証又は読取確認の再現手順。
- [local-only/mock-exam-hierarchy-20261027/preservation.json](<../local-only/mock-exam-hierarchy-20261027/preservation.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/preserved-copies.json](<../local-only/mock-exam-hierarchy-20261027/preserved-copies.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/private-check.log](<../local-only/mock-exam-hierarchy-20261027/private-check.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/review.md](<../local-only/mock-exam-hierarchy-20261027/review.md>): 個別の検証・評価又は独立レビュー。
- [local-only/mock-exam-hierarchy-20261027/sfc-check.log](<../local-only/mock-exam-hierarchy-20261027/sfc-check.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/source-check-final.json](<../local-only/mock-exam-hierarchy-20261027/source-check-final.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/source-check.json](<../local-only/mock-exam-hierarchy-20261027/source-check.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/synthetic-conditions-320.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-conditions-320.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-conditions-390.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-conditions-390.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-conditions-desktop.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-conditions-desktop.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-mobile-menu-320.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-mobile-menu-320.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-mobile-menu-390.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-mobile-menu-390.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-practice-390.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-practice-390.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/synthetic-sidebar-desktop.jpg](<../local-only/mock-exam-hierarchy-20261027/synthetic-sidebar-desktop.jpg>): 実画面の確認画像。
- [local-only/mock-exam-hierarchy-20261027/typecheck.log](<../local-only/mock-exam-hierarchy-20261027/typecheck.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/ui-checks.json](<../local-only/mock-exam-hierarchy-20261027/ui-checks.json>): 入力/状態/件数/指紋又は実測結果。
- [local-only/mock-exam-hierarchy-20261027/ui-runtime.mjs](<../local-only/mock-exam-hierarchy-20261027/ui-runtime.mjs>): 今回だけの隔離検証又は読取確認の再現手順。
- [local-only/mock-exam-hierarchy-20261027/ui-server.log](<../local-only/mock-exam-hierarchy-20261027/ui-server.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/ui-setup.log](<../local-only/mock-exam-hierarchy-20261027/ui-setup.log>): 実行ログ。
- [local-only/mock-exam-hierarchy-20261027/ui-setup.ts](<../local-only/mock-exam-hierarchy-20261027/ui-setup.ts>): 今回だけの隔離検証又は読取確認の再現手順。
- [local-only/mock-exam-hierarchy-20261027/verification.md](<../local-only/mock-exam-hierarchy-20261027/verification.md>): 個別の検証・評価又は独立レビュー。
- [local-only/mock-exam-hierarchy-20261027/workflow-check.log](<../local-only/mock-exam-hierarchy-20261027/workflow-check.log>): 進捗形式・依存関係の検査ログ。
