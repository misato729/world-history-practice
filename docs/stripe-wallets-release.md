# Wallet/PayPay対応の送信・本番反映（2026-11-03）

ユーザーが今回の4リポジトリのコミット・push・本番反映を明示承認。公開先のないテンプレートは追加回答によりコミット・pushのみとし、新規の公開先/DBを作成しない。実装の詳細は [docs/stripe-wallets.md](stripe-wallets.md)。

## 送信・配信の範囲

今回のCheckout、合成回帰、特商法の支払方法、関連資料・進捗だけを送信する。世界史の共有state/文脈カードはHEAD由来に今回分だけを追加したindexとし、元の作問/入替/Writer等を保持。日本史のproduct、templateの認証/パスワード等の既存dirtyは除外する。テンプレート同梱workflowは世代0/空を保持し、サービス用の配信値を追加しない。

3サービスのFlyは現在の構成を限定照会し、既存の採点注入ファイル、実行環境、販売状態を保持して配信する。秘密値/注入本文はログ・Git・Docker build contextへ出さない。新migration/seedなし。実カード/ウォレットの支払確定やStripeの審査/支払方法設定を操作しない。

実装時の合成試験と本番の反映確認を以下で区別して記録する。

## 完了した送信・CI

- 実装コミット `d0fe2c3108edca89c87e8e5a790fab5c8073bba0` を `origin/main` へpush。対象SHAの[GitHub Actions](https://github.com/misato729/world-history-practice/actions/runs/41545286094)は **success**（harness・verifyすべて成功）。
- 合成の決済回帰は4版計140件、法務12件が成功・skip 0、型検査4版成功。コード変更後の必須CIも上記SHAで確認。

## 本番の確認結果

- Netlify `world-history-practice` の[デプロイ](https://app.netlify.com/projects/world-history-practice/deploys/6ae91bdac7e9eddd7553b539)は **Published**。公開元は上記実装SHAと一致。
- Fly `world-history-practice` の既存2台を順次更新。image `registry.fly.io/world-history-practice:wallets-d0fe2c3`。実装SHAから追跡済みの実行用ファイルのみを取り出してビルドし、未コミットの別作業は混ぜていない。
- 起動中VMでCheckoutソースのSHA-256 `838ac3cef4987578ec6c45850182a3f0031440215762d4a9fa96168e005a6389` が該当実装コミットと一致し、配信済みビルドにもcard/link/paypayの許可集合があることを確認。
- healthは正常。既存VM ID・環境設定・VM資源を保全し、採点用の既存注入ファイル0件も内容の照合値が一致。秘密値・教材本文は記録/公開していない。
- 公開の販売設定は **有効** のまま。500円・JPY・買い切り・模試5まで無料を保持。情報教認の販売開始操作は行っていない。
- 本番の特商法ページをPC1280×800/SP390×844で確認。5手段と利用条件の注記を表示し、横はみ出し・重なりなし。計3サービス6画面を確認した。

## 確認の限界

Apple Pay/Google Payはカード系ウォレットとしてStripeが端末等の条件を判断し、Link/PayPayは許可対象へ追加した。PayPayの審査中状態・Stripe側の支払方法設定は変更していない。今回、実際のCheckoutで各ボタンの表示、カード/ウォレットによる実決済や返金の成功は確認していない。審査完了や対応端末での表示・実決済成功を本記録から推定しない。

## 変更ファイル一覧

今回の実装コミットに含めたファイルは以下。後続は反映結果を記録する文書・引き継ぎのみを追加し、アプリの実装は同じSHAを維持する。

- [STRIPE_INTEGRATION_TODO.md](../STRIPE_INTEGRATION_TODO.md)
- [docs/premium-membership-20261102.md](../docs/premium-membership-20261102.md)
- [docs/stripe-wallets-release.md](../docs/stripe-wallets-release.md)
- [docs/stripe-wallets.md](../docs/stripe-wallets.md)
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)
- [docs/workflow/handoffs/2026-11-02T23-13-08-694Z-r272.json](../docs/workflow/handoffs/2026-11-02T23-13-08-694Z-r272.json)
- [docs/workflow/handoffs/2026-11-02T23-13-10-188Z-r273.json](../docs/workflow/handoffs/2026-11-02T23-13-10-188Z-r273.json)
- [docs/workflow/handoffs/2026-11-02T23-22-50-270Z-r274.json](../docs/workflow/handoffs/2026-11-02T23-22-50-270Z-r274.json)
- [docs/workflow/state.json](../docs/workflow/state.json)
- [frontend/app/pages/commercial-disclosure.vue](../frontend/app/pages/commercial-disclosure.vue)
- [frontend/server-tests/payments.test.ts](../frontend/server-tests/payments.test.ts)
- [frontend/server/services/payment-checkout.ts](../frontend/server/services/payment-checkout.ts)

最終の反映記録は`[skip netlify] [skip ci]`付きの文書コミットとして送信し、確認済みの実装SHAの本番配信を再実行しない。文書コミット自体のCI成功を意味しない。

## 最終独立レビュー

`premium_review` が4 CIの対象SHAと成功を独立照会し、3本番ソースhashを各コミットから再計算、配信証拠・PC/SP6画像・既存未コミット変更の照合値を確認して **PASS**。template送信のみ、情報教認販売無効、実決済未確認の区別も照合した。

反映確認後の変更ファイル：

- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)
- [docs/workflow/state.json](../docs/workflow/state.json)
- [docs/workflow/handoffs/2026-11-02T23-39-10-516Z-r275.json](../docs/workflow/handoffs/2026-11-02T23-39-10-516Z-r275.json)
- [docs/workflow/handoffs/2026-11-02T23-39-12-064Z-r276.json](../docs/workflow/handoffs/2026-11-02T23-39-12-064Z-r276.json)
- [docs/workflow/handoffs/2026-11-02T23-40-01-330Z-r277.json](../docs/workflow/handoffs/2026-11-02T23-40-01-330Z-r277.json)
