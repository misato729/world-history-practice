# SMTPメール再設定の試作記録（不採用）

2026-11-02にローカル実装・検証したが、同日のユーザー方針変更で不採用となった。通常/本番へのDB変更・メール送信・コミット・push・配信は行っていない。現行方針は[問い合わせと管理者による手動再設定](manual-password-reset-20261102.md)。

旧実装と当時の全文記録は[ローカル専用の退避先](../local-only/email-password-reset-retired-20261102/docs/email-password-reset-20261102.md)へ保存した。SMTPサービス、URLトークンのAPI/画面、ライブラリ、未公開SQL010は現行の配信対象から外している。SQL010は使い捨て_test DBでのみ適用したもので、通常/本番の適用済みSQLは変更していない。既存の_test DBを再利用/書換えず、新しい手動再設定用_test DBで検証する。

当時のサーバー101件・フロント475件、型検査/build、PC/SPの結果は[ローカル検証記録](../local-only/password-reset-20261102/ui-verification.json)と同フォルダのログに保持する。現在の手動再設定を確認した結果ではない。

- [r221](workflow/handoffs/2026-11-02T02-49-22-314Z-r221.json)：初回レビュー指摘。
- [r222](workflow/handoffs/2026-11-02T02-57-46-238Z-r222.json)：当時の合格評価。
- [r223](workflow/handoffs/2026-11-02T02-57-50-206Z-r223.json)：当時のローカル実装完了。
