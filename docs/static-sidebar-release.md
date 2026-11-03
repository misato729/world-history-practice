# 静的サイドバーの送信・本番反映（2026-11-03）

今回の4リポジトリのcommit/pushと、既存3サービスのNetlify反映が明示承認された。公開先のないテンプレートは既存の追加回答を維持してpushのみ。新規公開先・販売開始・DB操作は行わない。

[実装内容とローカル検証](static-sidebar.md)の後続段階。世界史のAGENTS/state/文脈カードはHEAD由来へ今回分だけを統合し、作問・入替・Writer等の元dirtyを保持する。日本史のproduct、templateの認証/パスワード等の元dirtyは送信しない。ローカル専用進捗・教材・秘密値をGit/ビルドへ持ち込まない。

変更は画面・クライアントのカタログ整形・回帰・ルール/記録に限る。今回はFly/APIサーバーの再配信やDB更新を必要としない。CIの成功、NetlifyのPublished/実装SHA、公開画面のPC/SP操作は実施後に区別して追記する。

## 完了した送信と検査

実装コミット [fcc7476](https://github.com/misato729/world-history-practice/commit/fcc7476d0cb5329fa48670adfc9043c1dc34741a) をmainへpushした。送信直後にローカルHEAD・origin/main・リモートmainが一致し、ahead/behindが0/0であることを確認した。

[CI実行](https://github.com/misato729/world-history-practice/actions/runs/41556382074) はすべて成功（harness、verify）。送信前に、HEADから今回分だけを組み立てたindexのコピーで関連テストを再実行し、4版合計104件すべて成功・skip 0を確認した。実装段階で4版の型検査も成功済み。再実行を別の104件として加算しない。

[Netlify公開記録](https://app.netlify.com/projects/world-history-practice/deploys/6ae9313ffddd917acebd820d) でPublishedと同じ実装SHAを確認した。Auto publishingはON。公開先は [世界史ラボ](https://world-history-practice.netlify.app/)。これは既存Netlifyフロントエンドの自動公開であり、Fly/API・DB・Stripe設定の変更は含まない。

## 本番画面で確認した範囲

2026年11月3日、既存3サイトの本番URLを匿名状態で操作。PC 1280×900とスマートフォン390×844で、静的ホームの模試6を開閉し、親子の誘導先が`/premium`であることを確認した。世界史・日本史は設定の10行、情報教認は50行を維持。世界史・日本史の静的な子は会員案内1件、情報教認は設定の問1〜20を静的に表示する。横方向の文書はみ出しはなく、開閉・スクロールを操作できた。各サイトの静的/取得後×PC/SPの計12枚を目視確認した。世界史のPCサイズ切替直後の遷移中画像は採用せず、幅260pxで落ち着いた画像に撮り直した。

取得後の確認では、世界史・日本史の`/practice/start`を条件未指定で開き、API接続正常と無料模試の実在開始番号への切替、模試6〜10が引き続き静的で開閉できることを確認した。この確認経路の「模擬試験を選択してください」は未指定条件の通常エラーであり、演習完了の証拠ではない。情報教認は`/practice/1/1`で問1の読込完了後、模試6の親と子20件がロックされたまま開閉できることを確認した。解答送信、履歴作成、購入は行っていない。

本番で問題APIの呼出回数を計測したとは扱わない。追加呼出0、ログイン済み無料会員、資格変更/降格、実在する有料番号の表示は実装段階の回帰テストと合成UIで確認した。本番匿名表示と有料実アカウントの検証を混同しない。テンプレートの画面検証は合成データのローカル検証であり、本番公開済みとは扱わない。

## 送信範囲と既存作業の保持

実装前のdirtyと送信前のハッシュ控えを照合。世界史の作問・Writer/入替と文書、日本史のproduct、テンプレートの認証/パスワード等の別作業は保持し、今回のコミットへ含めていない。共有AGENTS/state/カードはHEADへ今回分だけを統合してstageした。ローカル資料・秘密値・私用進捗を含めず、保護用検査と有効なpushフックを通した。TQCEは共通の資料保護検査でも送信範囲を確認した。

別担当`premium_review`が送信前の差分と実装候補を独立確認しPASS。続いて同担当が4件CIと実装SHA、実コミットの全ファイル、3Netlify Published同SHA、12状態のDOMと画像を独立照合し、最終レビューもPASS（修正必須事項なし）。最後の記録だけのコミットは`[skip netlify] [skip ci]`を付け、確認済みの実装SHAを再ビルドしない。後続コミットにコードや設定を混ぜない。

## 今回の変更ファイル

以下は実装コミットに含めた全ファイル。今回の送信・確認段階では配信記録と進捗の完了情報を更新する。開始前の別作業は含めない。

- [AGENTS.md](../AGENTS.md) — 一般化したサイドバーの確認基準。
- [docs/static-sidebar-release.md](../docs/static-sidebar-release.md) — 送信・CI・公開確認記録。
- [docs/static-sidebar.md](../docs/static-sidebar.md) — 実装・ローカル検証記録。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) — 今回の文脈カード。
- [docs/workflow/handoffs/2026-11-03T00-28-37-828Z-r278.json](../docs/workflow/handoffs/2026-11-03T00-28-37-828Z-r278.json) — 評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T00-47-54-698Z-r279.json](../docs/workflow/handoffs/2026-11-03T00-47-54-698Z-r279.json) — 評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T00-47-56-230Z-r280.json](../docs/workflow/handoffs/2026-11-03T00-47-56-230Z-r280.json) — 評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T00-53-24-017Z-r281.json](../docs/workflow/handoffs/2026-11-03T00-53-24-017Z-r281.json) — 評価・引き継ぎ記録。
- [docs/workflow/state.json](../docs/workflow/state.json) — 今回の進捗と確認範囲。
- [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue) — 静的メニュー・親子ロックの表示。
- [frontend/app/utils/examCatalog.ts](../frontend/app/utils/examCatalog.ts) — API後も有料静的行を補完する整形。
- [frontend/tests/catalogExamNavigation.test.ts](../frontend/tests/catalogExamNavigation.test.ts) — 回帰検査。
- [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts) — 回帰検査。
- [frontend/tests/sidebarCatalogAccess.test.ts](../frontend/tests/sidebarCatalogAccess.test.ts) — 回帰検査。
## 記録整理時の確認

共通の配信記録の生成で末尾に空行が入り、最初の世界史の`git diff --check`が不合格となった。記録生成の空行を整え、4版の形式検査と元作業の保全検査を再実行して成功した。配信済み実装のコード変更はない。

完了段階で追加した引き継ぎ記録：

- [docs/workflow/handoffs/2026-11-03T01-07-14-507Z-r282.json](../docs/workflow/handoffs/2026-11-03T01-07-14-507Z-r282.json) — 形式修正の評価、合格評価又は配信完了の記録。
- [docs/workflow/handoffs/2026-11-03T01-08-53-230Z-r283.json](../docs/workflow/handoffs/2026-11-03T01-08-53-230Z-r283.json) — 形式修正の評価、合格評価又は配信完了の記録。
- [docs/workflow/handoffs/2026-11-03T01-08-54-860Z-r284.json](../docs/workflow/handoffs/2026-11-03T01-08-54-860Z-r284.json) — 形式修正の評価、合格評価又は配信完了の記録。
