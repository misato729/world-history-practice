# Stripe決済画面のタイトル（2026-11-03）

日本史のStripe-hosted Checkoutで本文は日本史ラボだが、document.titleは情報教認ラボだった。アプリは既にbranding_settings.display_nameへ各siteNameを設定している。Stripeのアカウント名はmisatoの地歴ラボ、公開ビジネス名だけが情報教認ラボのまま。ユーザーの回答により、3サービス共通の公開ビジネス名をmisatoの地歴ラボへ変更した。

Stripeの公開情報画面の法人名（屋号）のみを変更し、法的な事業者情報、明細書表記、URL、支払方法、商品/価格、販売状態、利用資格、DBやアプリコードは変更しない。支払や決済情報の入力を行わない。顧客固有の決済URL・Session ID・入力値は記録しない。保存後に管理画面再読込と元のCheckoutのdocument.title/サービス名を照合した。

## 保存と確認の結果

Stripe管理画面の公開名1項目だけを保存した。保存クリックで操作ツールがtimeoutを返したが、dialogが閉じ公開名が更新済みだったため再クリックしなかった。管理画面を再読込して公開名がmisatoの地歴ラボで保持されることを確認。元の日本史Checkoutも再読込し、描画完了後のdocument.titleがmisatoの地歴ラボ、h1が日本史ラボ、商品名が日本史ラボ プレミアム会員であることを確認した。

実画面での確認対象はユーザー指定の日本史Checkout1件。アカウントの公開名は共通だが、世界史・情報教認の別の実Checkoutまで検査済みとは扱わない。新しい決済Sessionの作成・期限切れ・購入・決済情報の入力は行っていない。SDK/公式の[Checkout表示設定](https://docs.stripe.com/payments/checkout/customization/appearance.md?ui=full-page)と、既存branding_settings.display_nameの上部表示を区別する。

独立担当premium_reviewが、顧客URL/ID/入力値を含めない安全なtitle/heading/公開名の記録と公開名1行の画像を照合しPASS。アプリコード・環境変数・DB・価格や商品設定の変更、テストや再デプロイは不要。実装時点ではGit送信未依頼のため、記録だけ未コミットで保持していた。2026年11月4日の追加指示で、以下の作業記録をcommit/push対象とした。Stripe設定・アプリ・DBの再操作や再デプロイは行わない。

## 今回変更したファイル

- [docs/stripe-checkout-title-20261103.md](../docs/stripe-checkout-title-20261103.md) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。
- [docs/workflow/state.json](../docs/workflow/state.json) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。
- [docs/workflow/handoffs/2026-11-03T06-51-47-038Z-r292.json](../docs/workflow/handoffs/2026-11-03T06-51-47-038Z-r292.json) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。
- [docs/workflow/handoffs/2026-11-03T06-57-26-873Z-r293.json](../docs/workflow/handoffs/2026-11-03T06-57-26-873Z-r293.json) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。
- [docs/workflow/handoffs/2026-11-03T06-57-28-394Z-r294.json](../docs/workflow/handoffs/2026-11-03T06-57-28-394Z-r294.json) — 設定変更の記録、進捗・文脈又は評価・引き継ぎ。

- [docs/workflow/handoffs/2026-11-03T23-54-12-147Z-r328.json](../docs/workflow/handoffs/2026-11-03T23-54-12-147Z-r328.json) — 記録送信の明示承認と対象範囲の引き継ぎ。
