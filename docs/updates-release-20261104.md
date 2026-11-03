# 更新履歴の本番反映（2026-11-04）

ユーザーの明示依頼により両ラボをcommit/pushし、API・画面・本番DBまで反映した。日本史は追加指示のマイページ・学習マップ・設定フラグメント・静的大問名も同時公開。世界史の別件Stripe記録は除外して元の作業場所へ保持する。

## 配信と検証

- 実装SHA: `f20a3fb02a44c9aeac192bd65fe78775c6c54025`。後続の記録のみのコミットは`[skip netlify] [skip ci]`で送信し、この配信SHAを維持する。
- [GitHub Actions](https://github.com/misato729/world-history-practice/actions/runs/41721433656) のharness/verify/netlify-static全成功。
- Fly.io: `world-history-practice`、image `updates-f20a3fb02a`、既存2VMへrolling配信成功。VM ID、env、注入ファイル、guest資源、nrt配置の保持を安全な比較結果で確認。秘密値は記録しない。
- release commandの共通`db:migrate`が追加`011_service_updates.sql`を適用。適用済みSQL・問題seed・既存問題/利用者/回答履歴は変更しない。本番GET `/api/v1/updates`が指定3件と11/03→11/02→11/01の順序に一致し、テーブルと初期データの反映を確認。
- 匿名GET `/api/v1/admin/updates`は401。管理CRUDの書込は本番では試験せず、事前の隔離実DBと合成管理者UIで追加・編集・再読込・削除・競合・反復を検証済み。
- Netlify deploy `6aea525bf0ffc592da27af93` はready、publishedのcommit_refが上記SHAに一致。[公開サイト](https://world-history-practice.netlify.app/)で確認。
- 本番PC1280/SP390で「問題演習を始める→利用にあたって→更新履歴」の見出し順、日付と指定文言3件、幅一致を確認。PC/SP画像と設定保持証跡を独立担当achievement_reviewが確認しPASS。
- 配信用一時ソース、環境設定/注入ファイルの一時控えは削除済み。原本資料をビルド対象へ送信していない。

## 変更ファイル

[更新履歴の全変更一覧](updates-history-20261104.md#今回の変更ファイル既存作業は除外)に実装・テスト・進捗ファイルを列挙。本記録`docs/updates-release-20261104.md`と、公開結果を追記した同検証記録・`docs/workflow/contexts/service.md`・`docs/workflow/state.json`・今回生成したhandoffも変更した。

## 今回公開した全変更ファイル

- [docs/updates-history-20261104.md](../docs/updates-history-20261104.md)：仕様・検証・全変更と公開結果。
- [docs/updates-release-20261104.md](../docs/updates-release-20261104.md)：仕様・検証・全変更と公開結果。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)：世界史の公開結果。
- [docs/workflow/handoffs/2026-11-03T21-18-41-121Z-r319.json](../docs/workflow/handoffs/2026-11-03T21-18-41-121Z-r319.json)：作業・公開結果の引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T21-18-42-036Z-r320.json](../docs/workflow/handoffs/2026-11-03T21-18-42-036Z-r320.json)：作業・公開結果の引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T21-37-55-705Z-r321.json](../docs/workflow/handoffs/2026-11-03T21-37-55-705Z-r321.json)：作業・公開結果の引き継ぎ記録。
- [docs/workflow/state.json](../docs/workflow/state.json)：完了状態と検証根拠。
- [frontend/app/components/UpdatesHistory.vue](../frontend/app/components/UpdatesHistory.vue)：日付降順の公開一覧。
- [frontend/app/layouts/admin.vue](../frontend/app/layouts/admin.vue)：管理メニューへ更新履歴を追加。
- [frontend/app/pages/admin/updates.vue](../frontend/app/pages/admin/updates.vue)：管理者の追加・編集・削除画面。
- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：利用案内直下に更新履歴を追加。
- [frontend/server-tests/updates.test.ts](../frontend/server-tests/updates.test.ts)：権限・入力・CRUD・競合・再適用の検証。
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/[...path].ts)：更新履歴と必要なマイページAPIの振り分け。
- [frontend/server/database/migrations/011_service_updates.sql](../frontend/server/database/migrations/011_service_updates.sql)：更新履歴テーブルと指定の初期3件。
- [frontend/server/services/updates.ts](../frontend/server/services/updates.ts)：管理権限・入力・競合検査とCRUD。
- [frontend/shared/types/updates.ts](../frontend/shared/types/updates.ts)：更新履歴の型定義。
