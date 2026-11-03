# 静的サイドバーの開閉と有料枠表示（2026-11-03）

4リポジトリに同じ表示方針を反映するユーザー依頼。開閉だけでは問題APIを呼ばず、無料会員のAPI結果から有料枠が欠落しても設定上の枠を静的に表示する。

世界史・日本史の未取得行は実大問/問題番号を推測せず、汎用の開始/会員案内を子メニューにする。取得済みの公開無料行は実データを維持する。情報教認・テンプレートは設定由来の既存番号メニューを維持し、親/子のロック先をそろえる。

以下に実装と確認結果を記録する。コミット・push・配信・本番DB変更は本タスクの対象に含めない。

初回の関連回帰は40件中39成功・1失敗。資格変更前の行オブジェクトを保持する旧テストが、新たに再生成される表示行を参照していなかった。現在の行を再取得して資格更新後の表示を検査するようテストを修正して再実行した。静的行の行き先・API呼出数・実番号の回帰は初回から成功。

## 実装

各表示行に`isStatic`を持たせ、一覧の取得状態と行の由来を分けた。静的行にもローカル状態だけで開閉するメニューを表示し、無料の開始先は既存の`/practice/start?exams=n`、ロック中の親/子は`/premium`とする。API取得後は実公開の無料行（疎な先頭番号・大問タイトル・子順を含む）を維持し、設定上の有料枠だけを静的行で重複なく補完する。APIが有料拒否を返す場合も実大問へ進めない。未公開・0件の無料枠をAPI後に作らず、未取得の実大問/問題番号は推測しない。資格失効時も開いている有料行の実大問を汎用の会員案内へ切り替える。

## 検証結果

- 本版の関連回帰 **40件成功、失敗/skip 0**。4版合計104件。`npm run typecheck`相当のNuxt型検査も4版成功。重い検査は逐次実行した。
- 回帰で静的ページ列挙、開閉時の追加取得0、資格確認→一覧取得の順、API後の有料枠補完・重複なし、実番号/大問維持、資格失効/遅延応答による詳細の再混入防止を確認した。
- 実際のSFCを使う専用プレビューを、PC1280×900/SP390×844で操作。静的な開閉前後と、合成の問題情報を1回取得した後の表示を確認し、4版16枚を保存した。全版で横はみ出しなし。既存のモバイル2列・スクロール・ページ遷移時の閉鎖を維持した。
- UIでも静的時の開始先と会員案内、開閉で問題API 0のまま、演習画面で1回取得後の有料枠、公開群の開始番号3、有料群の開始番号9、資格降格後の実大問消失/会員案内への切替を確認した。
- プレビューは本番・通常DB・実ユーザーを使わず、合成の会員状態/カタログ応答で操作。コピー内の認証初期値・API応答・リクエスト件数表示だけを検証用に置き換えている。これは実ログインや本番API/DBの検証ではない。JPのプレビューでは既存APIプラグイン名の違いによる二重登録、TQCEではセッション認証用に不要なcookie helper参照を起動準備時に修正した。これらは専用コピーだけの修正で実装差分へ混ぜていない。
- 原設定と問題DB・秘密値・Stripe設定を変更しない。既存の別作業の照合値を保持し、差分検査を実施した。テンプレートの公開workflow初期状態も維持した。

独立担当`premium_review`が4版のコード/回帰/型検査と16枚のPC/SP画像、元設定・AGENTSの整合を確認して最終 **PASS**。専用プレビュー以外のビルド/本番確認は行っていない。

## 今回の変更ファイル

- [AGENTS.md](../AGENTS.md) — 静的開閉・ロック行の表示と安全な補完方針を既存ルールへ統合。
- [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue) — 静的な開閉と有料枠の親/子ロック。
- [frontend/app/utils/examCatalog.ts](../frontend/app/utils/examCatalog.ts) — 静的/実データの行生成、有料枠補完と拒否判定。
- [frontend/tests/catalogExamNavigation.test.ts](../frontend/tests/catalogExamNavigation.test.ts) — 実番号保持と静的補完の純粋回帰。
- [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts) — 汎用子メニューと既存レイアウトの検査。
- [frontend/tests/sidebarCatalogAccess.test.ts](../frontend/tests/sidebarCatalogAccess.test.ts) — API回数・無料取得後・権限変更の回帰。
- [docs/workflow/state.json](../docs/workflow/state.json) — 今回の受入条件・検証・評価記録。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) — 今回の実装と確認結果への短い参照。
- [docs/static-sidebar.md](../docs/static-sidebar.md) — 本記録とファイル別の変更一覧。

一時的なUI証拠：`/tmp/sidebar-world-{static,api}-{pc,sp}-20261103.png`。問題API件数は専用プレビューの可視カウンターで照合した。静的SP画像は一度取得した後に戻った状態も含み、開閉で件数が増えないことを検証している。一時ファイルの永続性を前提にせず、本記録とリポジトリ内の回帰を確認結果の正本とする。

追加の評価・引き継ぎ記録：

- [docs/workflow/handoffs/2026-11-03T00-47-54-698Z-r279.json](../docs/workflow/handoffs/2026-11-03T00-47-54-698Z-r279.json) — 今回の評価・完了記録。
- [docs/workflow/handoffs/2026-11-03T00-47-56-230Z-r280.json](../docs/workflow/handoffs/2026-11-03T00-47-56-230Z-r280.json) — 今回の評価・完了記録。
- [docs/workflow/handoffs/2026-11-03T00-28-37-828Z-r278.json](../docs/workflow/handoffs/2026-11-03T00-28-37-828Z-r278.json) — 今回の評価・完了記録。

## 後続の送信・配信依頼

2026年11月3日の追加依頼により、上記の実装をコミット・push・本番反映する。[送信・本番確認の記録](static-sidebar-release.md)を参照。テンプレートはpushまで。
