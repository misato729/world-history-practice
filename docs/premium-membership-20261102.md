# プレミアム会員機能（2026-11-02）

## 依頼と参照

両Historyラボへ情報教認と同じプレミアム機能を実装する。参照はユーザー指定 https://github.com/misato729/TQCE-info-practice のmain 623e63df46a8b4eb57ce716e36fc34b1cbd45262。対象ファイル26件だけをローカルの一時参照に抽出し、参照元は編集しない。

## 同じにする仕様

- 500円（税込）、JPYの買い切り。月額・自動更新なし。
- 模試1〜5は未ログインでも無料、6以降とお気に入りは有効なプレミアム資格/管理者/期限付き検証資格で利用。履歴保存は会員向け。今後の公開模試も対象。
- Stripe hosted Checkoutのカード払い。未購入/ログイン/規約同意と販売準備を確認し、同一利用者の未完了Checkoutは再利用、二重購入を防止する。
- raw-body署名と金額/通貨/Price/所有者/modeを照合したWebhookで付与。重複/順序逆転、全額返金/支払取消/紛争/部分返金を参照と同じに扱う。
- 完了画面は購入確認済みactiveと、管理者/検証資格等による利用可を分ける。強制取得・8回上限・同時確認の排他・画面離脱/所有者変更・古い応答の棄却を維持。
- 規約・プライバシー・特商法表示と導線を同期。直前のAdSense条項、各サービス名・テーマ・既存の記述/論述/文化史を保持する。

## 構成と作業境界

両版のpg/番号付きSQLと既存の決済/資格テーブルを再利用する。Prisma/Better Authへ移行しない。通常/本番DB・会員/教材データ・他作業の未コミット差分を変更しない。configはpaymentsの範囲だけを変更し、既存の模試数・分類を保持する。

機能の有効化と実際の販売開始は分ける。既存PAID_MEMBERSHIP_ENABLED=falseの例を維持し、Stripeキー/Price/Webhook/販売者情報は両サービスごとに用意する。他サービスの秘密値を複製しない。実決済、販売開始、本番設定/配信、commit/pushは今回の実装依頼に含めない。

検証・変更ファイル・未確認事項は実施後に追記する。

## 後続：トップページの静的表示と通信順

追加依頼によりプレミアム実装確認後に対応する。非ログインと無料会員は問題関連APIを呼ばず、模試6以降をロック付き静的表示。有資格者（プレミアム/管理者/有効な検証資格）は、最新の資格情報取得が完了した後だけ問題情報を取得する。現状はusePublicExamCatalogとサイドバーの資格確認が並行しており、順序は保証されていない。無料問題を実際に演習するときの必要な問題取得とは区別する。

## 初回検査と修正

世界史の画面関連29件と全体609件は成功。世界史の隔離決済検査では、追加した期限切れ検証資格の合成fixtureがcreated_atより前のexpires_atへ更新し、既存の期間制約に違反した1件のみ失敗。他の購入/署名/返金/紛争検査は成功。通常/本番の問題ではなくテストfixtureの不備として、created_atも過去へ合わせて修正し、両版の共有fixtureに反映した。日本史の画面関連29件は成功。修正後のDB検査は続行中。

世界史の全API初回検査では、旧無料モードの前提でお気に入りを登録していたAPI/パスワード検査3件が403となった。これらは保存データ保全を検査する合成一般会員へ有効な検証資格を付け、無料会員の403検査は別の既存ケースに維持した。加えて、開始時から未コミットだった模試並替のテストでfingerprintの期待不一致を検出し、プレミアムと独立した既存差分として切り分け中。

実画面のコールド認証で、Bearerのある初期user=null時に完了画面が先にowner未確定のまま確認を始め、/me一回で確認待ちへ落ちる点を検出。Historyの認証方式に合わせ、初回だけ所有者を取得してから強制購入確認へ進むよう補い、回帰テストを追加した。購入確認自体は強制再取得の結果だけを使う。

## 中間検証

- 決済の隔離DB検査は両版22件成功。単一/重複購入、Webhook署名/金額/所有者、返金/紛争、資格失効、無料5/有料6の境界を確認。
- フロント全体は世界史609件/日本史200件成功、skipなし。コールド認証の追加回帰を含む完了画面13件も成功。
- 世界史の関連全API103件成功。開始時から未コミットだったexam-set-swap.test.tsだけは変更前のpayments設定でもfingerprint期待の不一致が再現したため、別の既存失敗として記録し編集しない。
- 日本史の全APIは、実教材の採点規則を読まない専用の空カタログを明示し101件成功。初回は既存ローカル規則の読込がempty前提の検査と衝突したため、実データ非利用のテスト設定へ訂正。教材や製品側カタログは変更しない。
- 両版の一時コピーで依存パッチ/型/本番ビルド成功。初回コールド認証補正後は該当回帰に加えて型/ビルドと実UIを再確認する。
- 世界史の実部品/実API/隔離DBによる画面で販売準備中/500円/無料5・有料6をPC/SP確認、合成販売ready時にログイン→同意前disabled/同意後enabled→合成Checkout→キャンセル復帰を確認。実Stripeや実課金は使わない。


## 2026-11-03の追加確認・ホーム実装

Checkout Studioの既存呼び出し向け指示を照合。基本設定は既に一致していたため、購入処理の変更は最小限とした。ユーザーが購入者照合/規約同意/カード払い等の維持を明示承認。全基本パラメーターとpayment時のpayment_method_collection省略を決済テストで確認する。設定と実接続の残作業は[STRIPE_INTEGRATION_TODO.md](../STRIPE_INTEGRATION_TODO.md)を正本とする。Stripe Taxは自動計算なしを維持し、導入の要否と納税義務の判断は分ける。

プレミアム本体は完了画面のコールド再読込、購入済/管理者/検証資格の区別、販売準備中と合成販売ready・同意・キャンセルを両版PC1440/SP390で確認。独立レビューは本体PASS。実Stripeへの接続・購入ではなく、隔離DBと実アプリAPI、Checkoutだけ合成応答の検証である。

ホームは非ログイン/無料会員に設定上の模試スロットを静的表示し、6以降はロックで案内する。問題数・大問情報を静的設定から推測しない。現在資格は強制/meの完了まで不許可とし、有料会員/管理者/期限内の検証資格だけ実カタログを読む。認証変更・通信失敗・期限切れでは資格とカタログを再利用しない。

無料の条件演習はホームで件数を取得せず、開始後の/practice/startで実公開カタログを照合する。模試/章節/文化史条件を保持し、疎な番号でも実在する先頭へ進む。0件なら条件外へ進まない。ランダム演習は演習ページと同じuint32のseed条件を使用する。独立レビューで見つかった不正/未指定seedの不一致を修正し、4反例を追加した。

画面全体の回帰は世界史624件/日本史215件成功（skipなし）。追加seed修正後は資格10件と開始8件の18件で成功。最初の世界史全体検査は実行環境のローカルポート制限で依存互換性検査1件が停止し、ローカル通信可能な環境で全件成功を確認した。両版の型・最終ビルド・ホーム実画面通信検証は以下に最終結果を追記する。

## 今回の変更ファイル

以下はこの機能実装で変更したファイルのみ。開始時からのAGENTS内の別基準、模試並替/作問文書・Writer差分は対象に含めない。AGENTSはトップ通信条件の1項目のみ今回追記。configと進捗一覧は既存の別作業差分を保持したまま今回の該当箇所のみ追加した。

| ファイル | 今回の変更 |
| --- | --- |
| [config/exam.json](../config/exam.json) | プレミアム機能・無料5回・500JPYの設定のみ |
| [frontend/shared/examConfig.ts](../frontend/shared/examConfig.ts) | 500円の料金表示 |
| [frontend/server/services/payment-checkout.ts](../frontend/server/services/payment-checkout.ts) | 契約確認の料金表記と設定値連動 |
| [frontend/app/pages/premium/index.vue](../frontend/app/pages/premium/index.vue) | 無料範囲・現在/今後の模試の利用資格案内 |
| [frontend/app/pages/premium/complete.vue](../frontend/app/pages/premium/complete.vue) | 購入確認・別資格の区別、強制再取得、コールド認証 |
| [frontend/app/pages/terms.vue](../frontend/app/pages/terms.vue) | 買い切り・返金・退会・提供終了時の扱い |
| [frontend/app/pages/privacy-policy.vue](../frontend/app/pages/privacy-policy.vue) | Stripe・決済記録と資格削除、既存広告条項保持 |
| [frontend/app/pages/commercial-disclosure.vue](../frontend/app/pages/commercial-disclosure.vue) | 料金と対象模試、草案文除去 |
| [frontend/app/composables/useQualifiedExamAccess.ts](../frontend/app/composables/useQualifiedExamAccess.ts) | 最新の資格確認と認証/期限切れ遮断（新規） |
| [frontend/app/pages/index.vue](../frontend/app/pages/index.vue) | 無料/匿名は静的表示、有資格者だけカタログ取得 |
| [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue) | ホームの資格確認前API遮断、静的案内 |
| [frontend/app/pages/practice/start.vue](../frontend/app/pages/practice/start.vue) | 開始後の実在問題・条件・0件・ランダム順確認（新規） |
| [frontend/tests/premiumCompletionAccess.test.ts](../frontend/tests/premiumCompletionAccess.test.ts) | 完了画面の資格・認証切替回帰（新規） |
| [frontend/tests/qualifiedExamAccess.test.ts](../frontend/tests/qualifiedExamAccess.test.ts) | 資格確認順序・失敗・期限・認証切替（新規） |
| [frontend/tests/practiceStart.test.ts](../frontend/tests/practiceStart.test.ts) | 疎番号・0件・有料ロック・seed条件（新規） |
| [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts) | 条件付きカタログへの変更と既存階層の検査 |
| [frontend/tests/examConfig.test.ts](../frontend/tests/examConfig.test.ts) | 小規模合成設定の無料範囲を明示 |
| [frontend/tests/legalPages.test.ts](../frontend/tests/legalPages.test.ts) | プレミアム規約と既存広告条項の検査 |
| [frontend/server-tests/payments.test.ts](../frontend/server-tests/payments.test.ts) | Checkout指定・資格/無料5・有料6境界・返金検査 |
| [frontend/server-tests/api.test.ts](../frontend/server-tests/api.test.ts) | 保存データ検査用合成会員の資格明示 |
| [frontend/server-tests/password-reset.test.ts](../frontend/server-tests/password-reset.test.ts) | 保存お気に入り検査用合成会員の資格明示 |
| [frontend/server-tests/learning.test.ts](../frontend/server-tests/learning.test.ts) | 小規模合成設定の無料範囲を明示 |
| [STRIPE_INTEGRATION_TODO.md](../STRIPE_INTEGRATION_TODO.md) | 各サービスのStripe設定・販売開始前の残作業（新規） |
| [docs/premium-membership-20261102.md](premium-membership-20261102.md) | 仕様・実施結果・限界と変更ファイル一覧（新規） |
| [docs/workflow/state.json](workflow/state.json) | 今回2タスクの条件・進捗のみ |
| [docs/workflow/contexts/service.md](workflow/contexts/service.md) | 今回の実装・検証・未公開の区切り |
| [AGENTS.md](../AGENTS.md) | 今回合意した静的トップ・資格確認順・開始時の実数確認の1項目のみ追記 |


## 最終確認（2026-11-03）

- 両版の型検査・本番向けビルド成功。日本史ビルド初回は依存フォルダの検証用ロック書込が実行制限で停止したため、許可された環境で再実行して成功。最後の演習開始画面のランドマークタグ修正は両版の対象8テンプレートをVueで再コンパイルして確認した。
- Checkout Studioの基本指定を含む最終決済テストは両版22/22成功。実Stripe接続はなし。資格/開始の18回帰は両版成功、skipなし。
- 実際のビルドアプリ+実API+使い捨てPostgreSQLのブラウザ確認で、両版とも匿名ホーム再読込/条件タブのAPI呼出0、無料会員ホーム再読込/条件タブは/meだけ、問題API0を確認。
- 購入済み会員（世界史）と期限内検証資格（両版）のホームで、/meを800ms遅延させ、応答完了後に/examsが始まることを時刻記録で確認。管理者・期限切れ・資格確認失敗・同一利用者のセッション変更は制御可能な非同期回帰で確認。管理者の完了画面は両版実ブラウザでも購入完了と区別した。
- 無料会員は開始後に実問題を取得でき、世界史の順番演習、日本史のランダム演習へ到達。0件・疎番号・不正seedは回帰テストで確認。通常の実教材DBは使わない。
- 両版のPC1440/SP390でロック5件、横はみ出しなし、モバイル模試一覧、ロックカードから/premiumへの案内を確認。世界史のPCロック表示も初期・無料・資格取得後をDOMで確認し、SPを目視した。
- 独立担当premium_reviewがプレミアム本体と修正後ホームを最終PASS。初回ホームレビューのseed不一致と修正を評価履歴へ保持する。
- テンプレート整合と差分の軽量検査成功。世界史の開始時から存在する模試並替テスト1ファイルのfingerprint期待不一致は別件のまま残す。全API成功とは報告しない（関連103件は成功）。

実装・ローカル確認を完了。通常/本番DBの更新、Stripe実情報の登録、販売開始、commit/push、デプロイは行っていない。他作業の未コミット変更と実教材/原典を保持する。検証専用サーバー・プロキシを停止し、専用DBコンテナと一時接続情報を削除済み。通常のDB・既存サービスは変更していない。

### 今回生成した引き継ぎ記録

- [2026-11-02T15-22-41-387Z-r256.json](workflow/handoffs/2026-11-02T15-22-41-387Z-r256.json)：評価と引き継ぎの不変記録。
- [2026-11-02T15-22-43-532Z-r257.json](workflow/handoffs/2026-11-02T15-22-43-532Z-r257.json)：評価と引き継ぎの不変記録。
- [2026-11-02T15-22-45-986Z-r258.json](workflow/handoffs/2026-11-02T15-22-45-986Z-r258.json)：評価と引き継ぎの不変記録。
- [2026-11-02T15-22-47-315Z-r259.json](workflow/handoffs/2026-11-02T15-22-47-315Z-r259.json)：評価と引き継ぎの不変記録。
- [2026-11-02T15-22-49-466Z-r260.json](workflow/handoffs/2026-11-02T15-22-49-466Z-r260.json)：評価と引き継ぎの不変記録。
