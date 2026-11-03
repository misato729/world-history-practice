# 学習マップの本番反映（2026-11-03）

ユーザーのコミット・push・本番反映の明示依頼。世界史のみ。学習マップと関連する検証/進捗を対象とし、別件Stripeタイトルの文書差分は作業場に保持する。共有進捗ファイルは学習マップ分だけをステージする。既存Flyのenv・ファイル・VM資源・販売設定、実問題/利用者/履歴を保持する。DB構造変更なし、既存migration整合確認のみ。秘密値/私用資料は送信しない。

## 確認結果

送信前のPC/SP記号表示とCI、Netlify/Flyの配信後検証を順に記録する。匿名API検証と本人のレポート閲覧は区別し、本番利用者のログイン・回答・購入・メール操作は行わない。

## 初回CIと修正

実装コミット `fb90460796d0ed79b513dc6fd9ed90d0ca43d256` をmainへ送信。Netlifyは自動公開済みだが、[CI](https://github.com/misato729/world-history-practice/actions/runs/41615979574)の既存typography検査が追加アイコンのfont-size:24px/22pxを検出して停止。学習マップの2箇所だけを1.5rem/1.375remへ整え、ルート文字サイズへの追従を回復する。隔離DB/セキュリティ検査は成功。Flyはビルドのみ成功し、本番VMへの反映は保留した。

最終記号のPC合成コンポーネント表示を目視確認（横線/×/丸囲み×/対象外空欄）。SPはブラウザーの接続が再びタイムアウトし、変更後の再確認はまだ未完了。実利用者でのログイン操作は実施しない。

公開依頼はSP再確認未完了の報告に対するユーザーの明示承認。記号変更は実装/レビュー済みの内容を今回の配信対象とし、SP確認は別タスクに未完了として残す。未確認の条件を成功へ変更しない。

## 公開結果

- 最終実装SHA：`147091456c7a19657d6b813b27c09f5f7973ac8c`。初回実装fb90460と文字サイズ修正1470914をmainへ送信。
- [修正後CI](https://github.com/misato729/world-history-practice/actions/runs/41616794982)はharness/verifyとも成功。隔離DB、セキュリティ、全単体、型検査、アプリビルド、非root本番イメージの検査を含む。
- [Netlifyの公開記録](https://app.netlify.com/projects/world-history-practice/deploys/6ae9b2aee3c7db2b3a1b5bac)はready/Published、公開SHAは最終実装と一致。既存Git連携による自動配信。
- 公開`/account/`が返す配信JSで、学習マップ/未回答/丸囲み×/横線/集計APIパスを確認。最初の確認は`/account`の正規化301で空本文を読んだため未達となり、同じ公開ページへの正規リダイレクトを追って確認した。アプリは変更していない。
- Flyのimageは`registry.fly.io/world-history-practice:learning-map-147091456c`。2VMの新API/共通型/状態定義/dispatcher実ファイルのSHA-256が配信元ソースと一致。既存2VMのID、NRT配置、env、注入ファイル、guest資源を保持し、公開health・販売設定も維持。
- 新規SQLなし。既存10 SQLのソースは配信前後の稼働VMと一致。既存release commandのdb:migrateは通常どおり実行。検証のための実問題/利用者/履歴の取得・変更やseed、移行方式の変更は行っていない。
- フロントの公開API baseは既存の`https://world-history-practice.fly.dev`。この接続先で`GET /api/v1/me/achievement`が匿名401/no-storeで応答することを確認。Netlify同一originのAPIは既存構成上404であり、同一origin proxyがあるという初回検査の前提を訂正した。接続設定は変更しない。
- 独立担当achievement_reviewが送信差分、最小修正、Netlify/Flyのsafe証跡とSHA一致をレビューしPASS。秘密値・実利用者データは渡していない。
- 最終記号のPC表示は実コンポーネント＋合成データで確認（`/tmp/learning-map-symbols-final-pc-20261103.png`、rem修正前の形状確認）。文字サイズ修正後の型/文字サイズ/ビルドは検査成功。変更後SPの実表示再確認はブラウザー接続タイムアウトで未完了のまま区別する。本人ログインでの本番レポート閲覧も行っていない。

実装の本番配信は完了。SP実表示再確認の未完了タスクはそのまま保持し、成功へ変更しない。公開後の記録コミットは`[skip netlify] [skip ci]`を付け、検査・配信済みの実装SHAを維持する。別件Stripe文書/r292-294と共有ファイル内のその記録はローカルに残す。

## 変更ファイル

以下は初回配信コミットと最小修正の全27ファイル。最後の公開結果・進捗記録の更新ファイルは末尾へ追記する。

- [docs/achievement-report-20261103.md](achievement-report-20261103.md)
- [docs/learning-map-release-20261103.md](learning-map-release-20261103.md)
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)
- [docs/workflow/handoffs/2026-11-03T08-59-09-823Z-r295.json](workflow/handoffs/2026-11-03T08-59-09-823Z-r295.json)
- [docs/workflow/handoffs/2026-11-03T09-04-30-978Z-r296.json](workflow/handoffs/2026-11-03T09-04-30-978Z-r296.json)
- [docs/workflow/handoffs/2026-11-03T09-05-38-955Z-r297.json](workflow/handoffs/2026-11-03T09-05-38-955Z-r297.json)
- [docs/workflow/handoffs/2026-11-03T09-07-52-619Z-r298.json](workflow/handoffs/2026-11-03T09-07-52-619Z-r298.json)
- [docs/workflow/handoffs/2026-11-03T09-07-54-321Z-r299.json](workflow/handoffs/2026-11-03T09-07-54-321Z-r299.json)
- [docs/workflow/handoffs/2026-11-03T09-17-59-956Z-r300.json](workflow/handoffs/2026-11-03T09-17-59-956Z-r300.json)
- [docs/workflow/handoffs/2026-11-03T09-18-04-713Z-r301.json](workflow/handoffs/2026-11-03T09-18-04-713Z-r301.json)
- [docs/workflow/handoffs/2026-11-03T09-28-42-882Z-r302.json](workflow/handoffs/2026-11-03T09-28-42-882Z-r302.json)
- [docs/workflow/handoffs/2026-11-03T09-29-10-497Z-r303.json](workflow/handoffs/2026-11-03T09-29-10-497Z-r303.json)
- [docs/workflow/handoffs/2026-11-03T09-29-11-744Z-r304.json](workflow/handoffs/2026-11-03T09-29-11-744Z-r304.json)
- [docs/workflow/handoffs/2026-11-03T09-44-53-612Z-r305.json](workflow/handoffs/2026-11-03T09-44-53-612Z-r305.json)
- [docs/workflow/handoffs/2026-11-03T09-50-02-046Z-r306.json](workflow/handoffs/2026-11-03T09-50-02-046Z-r306.json)
- [docs/workflow/handoffs/2026-11-03T09-58-16-644Z-r307.json](workflow/handoffs/2026-11-03T09-58-16-644Z-r307.json)
- [docs/workflow/handoffs/2026-11-03T10-08-14-915Z-r308.json](workflow/handoffs/2026-11-03T10-08-14-915Z-r308.json)
- [docs/workflow/state.json](workflow/state.json)
- [frontend/app/components/AchievementReport.vue](../frontend/app/components/AchievementReport.vue)
- [frontend/app/composables/useAchievementReport.ts](../frontend/app/composables/useAchievementReport.ts)
- [frontend/app/pages/account.vue](../frontend/app/pages/account.vue)
- [frontend/server-tests/achievement.test.ts](../frontend/server-tests/achievement.test.ts)
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/[...path].ts)
- [frontend/server/services/achievement.ts](../frontend/server/services/achievement.ts)
- [frontend/shared/achievement.ts](../frontend/shared/achievement.ts)
- [frontend/shared/types/achievement.ts](../frontend/shared/types/achievement.ts)
- [frontend/tests/achievement.test.ts](../frontend/tests/achievement.test.ts)

公開結果の記録で更新したファイル：
- [docs/learning-map-release-20261103.md](learning-map-release-20261103.md)
- [docs/achievement-report-20261103.md](achievement-report-20261103.md)
- [docs/workflow/state.json](workflow/state.json)
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)
- [docs/workflow/handoffs/2026-11-03T10-16-32-896Z-r309.json](workflow/handoffs/2026-11-03T10-16-32-896Z-r309.json)
- [docs/workflow/handoffs/2026-11-03T10-16-38-960Z-r310.json](workflow/handoffs/2026-11-03T10-16-38-960Z-r310.json)

配信に使用した一時ソース2組と秘密を含み得る一時config/生の設定控えは検証後に削除。保護されたログと値を含まない証跡だけをローカル専用で保持。

## 最終のPC/SP再確認

その後ブラウザーの接続が回復し、修正済み実コンポーネント＋合成データでPC1280×900/SP390×844を確認できた。変更後の横線/×/丸囲み×/対象外空欄、凡例、未回答6問の絞り込み、表内の横スクロールを確認。document幅はPC1280/SP390と一致しページ全体のはみ出しなし。画像は `/tmp/learning-map-symbols-released-pc-20261103.png` と `/tmp/learning-map-symbols-released-sp-minus-20261103.png`。本番ログインの確認へは広げない。未確認だった記号表示のタスクも、実際の確認と独立レビューを根拠に完了へ更新する。前節の未確認表記は回復前の経緯として保持する。検証サーバーを停止し、ブラウザーの一時viewportを解除、検証タブを閉じた。

最終UI確認で作成した引き継ぎ：
- [docs/workflow/handoffs/2026-11-03T10-20-37-621Z-r311.json](workflow/handoffs/2026-11-03T10-20-37-621Z-r311.json)
- [docs/workflow/handoffs/2026-11-03T10-20-42-073Z-r312.json](workflow/handoffs/2026-11-03T10-20-42-073Z-r312.json)
