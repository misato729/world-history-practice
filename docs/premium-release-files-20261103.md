# プレミアム実装・配信の変更ファイル（2026-11-03）

今回の承認された機能コミットと配信記録のファイルを列挙する。並行する作問・教材本体・既存の未コミット差分は含めない。実際の配信と未確認範囲は[本番反映記録](premium-release-20261103.md)を参照。

- [AGENTS.md](../AGENTS.md)：仕様・検証・配信結果又は進捗の記録。
- [STRIPE_INTEGRATION_TODO.md](../STRIPE_INTEGRATION_TODO.md)：仕様・検証・配信結果又は進捗の記録。
- [config/exam.json](../config/exam.json)：料金/無料範囲と公開済み模試容量の設定。
- [docs/premium-membership-20261102.md](premium-membership-20261102.md)：仕様・検証・配信結果又は進捗の記録。
- [docs/premium-release-20261103.md](premium-release-20261103.md)：仕様・検証・配信結果又は進捗の記録。
- [docs/premium-release-files-20261103.md](premium-release-files-20261103.md)：仕様・検証・配信結果又は進捗の記録。
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)：仕様・検証・配信結果又は進捗の記録。
- [docs/workflow/handoffs/2026-11-02T15-22-41-387Z-r256.json](workflow/handoffs/2026-11-02T15-22-41-387Z-r256.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T15-22-43-532Z-r257.json](workflow/handoffs/2026-11-02T15-22-43-532Z-r257.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T15-22-45-986Z-r258.json](workflow/handoffs/2026-11-02T15-22-45-986Z-r258.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T15-22-47-315Z-r259.json](workflow/handoffs/2026-11-02T15-22-47-315Z-r259.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T15-22-49-466Z-r260.json](workflow/handoffs/2026-11-02T15-22-49-466Z-r260.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T21-33-27-135Z-r263.json](workflow/handoffs/2026-11-02T21-33-27-135Z-r263.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T21-33-28-066Z-r264.json](workflow/handoffs/2026-11-02T21-33-28-066Z-r264.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T21-33-57-399Z-r265.json](workflow/handoffs/2026-11-02T21-33-57-399Z-r265.json)：評価・引き継ぎの不変記録。
- [docs/workflow/handoffs/2026-11-02T21-41-43-757Z-r266.json](workflow/handoffs/2026-11-02T21-41-43-757Z-r266.json)：評価・引き継ぎの不変記録。
- [docs/workflow/state.json](workflow/state.json)：仕様・検証・配信結果又は進捗の記録。
- [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue)：匿名/無料の静的表示と資格確認後の取得・演習開始。
- [frontend/app/composables/useQualifiedExamAccess.ts](../frontend/app/composables/useQualifiedExamAccess.ts)：匿名/無料の静的表示と資格確認後の取得・演習開始。
- [frontend/app/pages/commercial-disclosure.vue](../frontend/app/pages/commercial-disclosure.vue)：会員/購入/法務画面と資格別案内。
- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：匿名/無料の静的表示と資格確認後の取得・演習開始。
- [frontend/app/pages/practice/start.vue](../frontend/app/pages/practice/start.vue)：匿名/無料の静的表示と資格確認後の取得・演習開始。
- [frontend/app/pages/premium/complete.vue](../frontend/app/pages/premium/complete.vue)：会員/購入/法務画面と資格別案内。
- [frontend/app/pages/premium/index.vue](../frontend/app/pages/premium/index.vue)：匿名/無料の静的表示と資格確認後の取得・演習開始。
- [frontend/app/pages/privacy-policy.vue](../frontend/app/pages/privacy-policy.vue)：会員/購入/法務画面と資格別案内。
- [frontend/app/pages/terms.vue](../frontend/app/pages/terms.vue)：会員/購入/法務画面と資格別案内。
- [frontend/server-tests/api.test.ts](../frontend/server-tests/api.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/server-tests/learning.test.ts](../frontend/server-tests/learning.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/server-tests/password-reset.test.ts](../frontend/server-tests/password-reset.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/server-tests/payments.test.ts](../frontend/server-tests/payments.test.ts)：決済・冪等性・他サービス通知・専用法務リンクの回帰。
- [frontend/server/services/payment-checkout.ts](../frontend/server/services/payment-checkout.ts)：買い切りCheckout・購入者照合・各ラボ名/専用法務リンク。
- [frontend/server/services/payment-webhooks.ts](../frontend/server/services/payment-webhooks.ts)：署名通知・返金/紛争処理と共有アカウントの対象外通知判別。
- [frontend/shared/examConfig.ts](../frontend/shared/examConfig.ts)：決済・会員資格・公開APIの対応。
- [frontend/tests/examConfig.test.ts](../frontend/tests/examConfig.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/tests/legalPages.test.ts](../frontend/tests/legalPages.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/tests/practiceStart.test.ts](../frontend/tests/practiceStart.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/tests/premiumCompletionAccess.test.ts](../frontend/tests/premiumCompletionAccess.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。
- [frontend/tests/qualifiedExamAccess.test.ts](../frontend/tests/qualifiedExamAccess.test.ts)：プレミアム資格・無料範囲・通信順の回帰検査。

追加の途中経過（既存の記録を改変せず保存）：

- [docs/workflow/handoffs/2026-11-02T16-43-01-991Z-r261.json](workflow/handoffs/2026-11-02T16-43-01-991Z-r261.json)：署名設定待ち又は初回配信評価の不変記録。
- [docs/workflow/handoffs/2026-11-02T21-30-39-637Z-r262.json](workflow/handoffs/2026-11-02T21-30-39-637Z-r262.json)：署名設定待ち又は初回配信評価の不変記録。
