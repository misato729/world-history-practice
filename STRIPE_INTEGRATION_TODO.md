# Stripe接続の設定・確認

Checkout Studioの指定は既存のCheckout呼び出しに反映済み。Stripe SDK 23の `ui_mode: hosted_page`、住所auto、電話番号収集なし、自動税なし、プロモーションコードなし、submit_type auto、integration_identifier hosted_web_0001、origin_context webを使用する。買い切りのmode paymentではpayment_method_collectionを送らない。

2026年11月3日のユーザー確認により、購入者・商品照合用metadata/client_reference_id、PaymentIntent metadata、連絡先メール、規約同意、契約内容の表示、カード払い指定、冪等キーは維持する。実際のPrice・戻り先は環境設定から解決し、サンプル値で置換しない。

## 未完了の接続作業

- [ ] このサービス専用のStripe Price（JPY 500円・買い切り）を用意する。
- [ ] API実行環境へSTRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET、STRIPE_PRICE_IDを設定する。秘密値はGit・チャット・文書・ログへ記載しない。
- [ ] FRONTEND_URLを実際のフロントURLへ設定する。成功先は/premium/complete、キャンセル先は/premium?canceled=1。
- [ ] APIの/api/v1/webhooks/stripeに署名付き通知を設定する。対象イベントはcheckout.session.completed、checkout.session.expired、refund.created、refund.updated、refund.failed、charge.dispute.created、charge.dispute.closed。
- [ ] テスト環境で購入、再送、返金、異議申立て、資格反映を確認する。
- [ ] 運営者・特商法情報と既存の販売準備検査を完了する。
- [ ] 本番設定と販売開始の明示承認後にPAID_MEMBERSHIP_ENABLEDを有効にする。現在は無効のまま。

公開鍵を必要としないサーバー生成のHosted Checkoutを使用する。STRIPE_LIVEMODEと各キー・Priceのモードを一致させ、別ラボのキーやPriceを流用しない。コード実装・合成テストと、実際のStripe接続・販売開始は別の確認として記録する。
