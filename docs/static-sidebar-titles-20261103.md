# 静的サイドバーの固定大問名

2026-11-03の依頼により、静的行の汎用「演習を開始」を実際の大問名に合わせる。公開カタログの全10模試40大問について、名称・番号・ID・先頭問題番号だけを固定定義へ収録。問題本文・正答は含めない。取得済み行はAPIを優先し、静的行は同じ大問ラベルと共通の表示CSSを使う。有料ロック中の全子リンクは/premium、無料・有資格時は確認済み実先頭問題へ。問題APIの追加取得はない。

関連25件と型検査成功。別担当レビューで公開カタログと固定40大問の完全一致を確認。合成ユーザーのローカルNuxtでPC1280の模試1、SP390の模試6の開閉・4大問名と全premiumリンク、ページ幅390を確認。初回は旧仕様のgroupsなし期待が残って失敗し、2つの既存テストを新仕様に更新して再成功。実DB変更・送信・本番反映なし。

変更ファイル:
- frontend/app/utils/staticExamGroups.ts：固定名称と先頭番号。
- frontend/app/utils/examCatalog.ts：静的行の大問と資格別リンク。
- frontend/tests/sidebarCatalogAccess.test.ts：静的大問とロックの検証。
- frontend/tests/catalogExamNavigation.test.ts：静的・動的カタログの検証。
- AGENTS.md：今回承認された固定メタの扱い。
- docs/static-sidebar-titles-20261103.md：確認記録。
- docs/workflow/contexts/service.md：作業引き継ぎ。

既存の別件Stripe差分と元の記録用ロックは保持する。

## 公開確認

追加依頼により実装88e5f61をmainへ送信。Netlify6ae9dd77fb424bcb2526bf54は同SHAで2026-11-03T13:11:45.003ZにPublished。本番privacyの静的サイドバーをPC1280/SP390で操作し、無料模試1の4大問名、有料模試6の4大問名と全子リンク/premiumを確認。SPのページ幅390、PCの長い名称の折り返しを確認。独立担当の画像/送信範囲レビューPASS（SP画像内は大問3/4、全4項目はDOM操作で確認）。回答・決済・フォーム送信や実DB変更なし。[CI41642108432](https://github.com/misato729/world-history-practice/actions/runs/41642108432)は全成功。Docker/DB/API/全フロントテスト/型/本番ビルド/非root本番イメージまで成功。

既存Stripe記録は共有文書から該当節を除いた内容だけステージして保持。最後の公開記録はskip ci/skip netlifyで送信し、検査済みの実装を維持する。
