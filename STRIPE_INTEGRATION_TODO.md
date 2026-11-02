# Stripe接続の設定・確認

Checkout Studioの指定は既存のCheckout呼び出しに反映済み。Stripe SDK 23の `ui_mode: hosted_page`、住所auto、電話番号収集なし、自動税なし、プロモーションコードなし、submit_type auto、integration_identifier hosted_web_0001、origin_context webを使用する。買い切りのmode paymentではpayment_method_collectionを送らない。

2026年11月3日のユーザー確認により、購入者・商品照合用metadata/client_reference_id、PaymentIntent metadata、連絡先メール、規約同意、契約内容の表示、カード・Link・PayPayの許可指定、冪等キーは維持する。Apple Pay/Google Payはカード系ウォレットとしてStripeの有効化と利用端末の条件に従う。2026年11月3日の追加依頼で許可手段を拡張した。実際のPrice・戻り先は環境設定から解決し、サンプル値で置換しない。

## 未完了の接続作業

- [x] このサービス専用のStripe Price（JPY 500円・買い切り）を用意し、active/live/one_time/500JPY/inclusiveを実接続で確認した。
- [ ] API実行環境へSTRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET、STRIPE_PRICE_IDを設定する。専用APIキーとPriceはFlyへstage済み、署名キーの取得/登録は追加確認待ち。秘密値はGit・チャット・文書・ログへ記載しない。
- [ ] FRONTEND_URLを実際のフロントURLへ設定する。成功先は/premium/complete、キャンセル先は/premium?canceled=1。
- [ ] APIの/api/v1/webhooks/stripeに署名付き通知を設定する。対象イベントはcheckout.session.completed、checkout.session.expired、refund.created、refund.updated、refund.failed、charge.dispute.created、charge.dispute.closed。
- [ ] テスト環境で購入、再送、返金、異議申立て、資格反映を確認する。
- [ ] 運営者・特商法情報と既存の販売準備検査を完了する。
- [ ] 本番設定と販売開始の明示承認後にPAID_MEMBERSHIP_ENABLEDを有効にする。現在は無効のまま。

公開鍵を必要としないサーバー生成のHosted Checkoutを使用する。STRIPE_LIVEMODEと各キー・Priceのモードを一致させ、別ラボのキーやPriceを流用しない。コード実装・合成テストと、実際のStripe接続・販売開始は別の確認として記録する。

現在のGit/CI・通知先・設定待ちの範囲は[本番反映記録](docs/premium-release-20261103.md)を参照。実販売は引き続き無効。合成DBの回帰検査と実Stripe Sandbox/本番の決済確認は区別する。

## 2026-11-03 本番反映後の更新

上のチェック欄は接続前/途中の記録。現在は専用APIキー/署名/Price/FRONTEND_URL/7イベント/販売者情報を設定し、販売有効化と本番配信を完了した。実通知受信3件ずつ成功、設定不足/監査警告なし。各28件の合成決済回帰は成功。実カード支払い確定/会員付与と実Stripe Sandboxの支払/返金/紛争は未確認であり、確認済みに繰り上げない。現在の配信SHAと根拠は[本番反映記録](docs/premium-release-20261103.md)の末尾を参照。秘密値の一時保管は削除済み。
