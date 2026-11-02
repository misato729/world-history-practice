# プレミアム機能の本番反映（2026-11-03）

## 依頼と範囲

両ラボの実決済・販売開始・commit/push・本番反映をユーザーが明示依頼。Stripeアカウントと特商法の運営者情報は情報教認と同じものを使用する確認回答を受領。実カードによる支払いの最終操作は本人へ引き継ぐ。

開始時は両FlyアプリにStripe/販売者の設定がなく、販売無効。情報教認の既存商品/通知先や他作業の未コミット変更を変更しない。今回のコードと法務/運用文書だけを範囲コミットし、公開済み模試の容量は保持する。日本史の公開済み10回に合わせた既存容量設定は、模試6以降の静的案内と本番の整合に必要な範囲として含める。教材本体・利用者・解答履歴・お気に入りは変更しない。

## 公開順序

不足するStripe接続と販売者情報が整うまでは販売無効とし、購入できない状態でロックだけを公開しない。コード送信時は[skip netlify]を使って自動公開を保留し、CIと接続確認後に承認済みの本番反映を実行する。Netlify契約・既存サイト・API/DBの配信先は維持する。

## 結果

作業中。確認した結果だけを追記する。


## 同一Stripeアカウントの通知分離

独立レビューで、同じアカウントの他サービスの購入/返金/紛争通知を500再送扱いする既存処理を検出。両ラボへ対象外Priceの判別を追加し、情報教認もユーザーの追加承認により処理1ファイルと回帰テストだけ同様に修正する。既知の決済は従来どおり照合し、未知の自分Price・metadata不足・設定不足・過去の自分Priceの先行返金は再送対象を維持する。

隔離した使い捨てDBで、世界史28/日本史28/情報教認27の決済回帰が成功（skipなし）。6件の追加回帰には他サービスの購入/返金/紛争、自サービスの先行通知、旧自分Priceと不正metadataを含む。本番DB・実Stripe決済は使用しない。

Stripeには世界史・日本史それぞれの税込500JPY・one_time・税内包の専用商品/Priceを作成済み。情報教認の既存商品/Priceは変更していない。同じ公開運営者情報、専用Priceとliveモードを両Flyアプリにstage済みで、販売はfalseを維持。その後、明示承認された専用の本番制限付きAPIキーを両ラボ分作成し、各Flyへstage済み。Priceを実APIで検証し、各キーの一時保管を削除した。署名キーは別途確認待ちで、販売は無効のまま。

### 今回追加した変更

- `frontend/server/services/payment-webhooks.ts`：同一アカウントの対象外Price判別。
- `frontend/server-tests/payments.test.ts`：対象外通知と従来の再送維持の6回帰。
- `docs/premium-release-20261103.md`：承認・公開順序・設定/検証と変更ファイルの記録。


## Git・CI・接続設定の確認済み範囲

- 世界史mainへ3ddfec4と0681f49をpush。後者のCI [41477287692](https://github.com/misato729/world-history-practice/actions/runs/41477287692) はharness/verifyとも成功。
- 日本史は4a318fdの後、並行する模試公開のe227431/00bcebeを通常mergeした0b66e8fをpush。CI [41478632902](https://github.com/misato729/japanese-history-practice/actions/runs/41478632902) はharness/verify/netlify-staticとも成功。既存の作問差分を保持し、強制pushはしていない。
- 情報教認5b0b2baをpushし、CI [41477288553](https://github.com/misato729/TQCE-info-practice/actions/runs/41477288553) はverify/browserとも成功。既存NRT2台へAPIを反映し、両イメージが5b0b2baであることを確認。移行台帳3件のchecksum一致、問題1000/利用者1/会員0/決済0は反映前後で不変。情報教認の画面・商品・通知先・販売設定は変更していない。
- 両ラボの専用制限付きAPIキーはCheckout Sessions書込、Prices/Payment Intents/Charges and Refunds読取の4権限。各専用Priceは実接続でactive/live/one_time/500JPY/inclusiveを確認。Stripeキーの値は記録しない。
- 世界史通知先we_1UXO6Q4aKzZO4ferUowO6JDQ、日本史通知先we_1UXOFp4aKzZO4ferf9tMseB4を作成済み。各ラボのFly URL、アカウントのsnapshot、API版2026-09-30.endive、指定7イベントを確認。

## 現在の待機点

自動承認審査が、別秘密値であるWebhook署名キーの取得/対応Flyアプリへの登録に追加の明示承認が必要として拒否した。ユーザーへ「両方の署名キーをStripeから取得し、世界史用はworld-history-practice、日本史用はjapanese-history-practiceへ登録する」確認を依頼中。拒否された操作を別手段で実行していない。世界史分の取得済み一時保管はローカル0600のまま、値を表示せず保持。日本史分は表示が拒否されており未取得。登録後に一時保管を削除する。

両ラボのFly機能配信・Netlify公開・販売有効化・実課金はまだ行っていない。署名設定後にAPI配信と準備検査、販売有効化、Netlify公開、本番PC/SP/通信確認を順に実施する。日本史のFly既存注入ファイル（非公開の論述採点規則）を保持する。元教材・ユーザー・履歴を更新しない。実カード支払いの最終操作は本人へ引き継ぎ、合成DB検査を実Stripe課金の成功と表示しない。

実装ファイル全件の一覧は[プレミアム実装記録](premium-membership-20261102.md)。この区切りでは本書、STRIPE_INTEGRATION_TODO.md、文脈カードと進捗/引き継ぎだけを更新する。


## 本番反映後の確認（2026-11-03、上の途中記録を更新）

世界史はdfd77384a641b781f74007499c6b355917384343、日本史はe1f454eccc314fc44e7c30bc3c1b05a1a2d9eda8をmainへ送信。最終CIは[世界史41525065173](https://github.com/misato729/world-history-practice/actions/runs/41525065173)、[日本史41525181218](https://github.com/misato729/japanese-history-practice/actions/runs/41525181218)ともsuccess。日本史はharness/verify/netlify-static全成功。

Netlifyは[世界史6ae8fc7d43585dc4603a7558](https://app.netlify.com/projects/world-history-practice/deploys/6ae8fc7d43585dc4603a7558)、[日本史6ae8fcc1f044e76e5e5aca01](https://app.netlify.com/projects/japanese-history-practice/deploys/6ae8fcc1f044e76e5e5aca01)が各最終機能SHAでPublished。Flyも各既存NRT2台へ同imageを反映し、既存の非公開注入ファイルを保持。販売は両ラボで有効化済み。settings.enabled/audit.sales_enabled/公開payments/configがすべてtrueで、機能有効・500JPY・one_time・無料5回・専用Price割当・HTTPS戻り先・Webhook/Checkoutソースhashを確認。準備不足と監査警告は空。

### 実接続と画面の確認範囲

- 専用の署名キーは追加承認後に各Flyへ登録し、一時キーを削除済み。3サービスの専用Priceは異なる。
- 本番Stripeで利用者メール/アプリ決済レコードを作らない未払いの確認用Checkoutを生成。release_validationのmetadataで識別し、カード入力・同意チェック・支払確定は操作せず、未払いを再照合して期限切れにし、一時URLを削除。実課金・返金・会員付与は0件。
- 初回の実決済画面で共通アカウントの情報教認名/規約リンクを検出。両版のpayment-checkout.tsへbranding_settings.display_nameとcustom_text.terms_of_service_acceptanceを加え、ラボ名と専用の規約/プライバシー/特商法リンクを同意直前に明示。28決済回帰を両版で再実行し全成功。
- 日本史の実Checkoutで専用ラボ名・500円・3リンク・同意必須を確認。世界史は専用ラボ名/商品/金額を実画面、専用リンク生成を回帰で確認。修正後の世界史の同意欄はLinkパスキー案内の再表示により、日本史と同じ範囲まで実画面確認していない。共通アカウントのフッターとLink保存案内には情報教認の表示が残る。アカウント全体の設定は変更していない。
- Stripe生成の未払い終了通知を両ラボで各3件受信し、署名検証/処理成功。Worldの署名なし通知は400、匿名購入開始401、health200。架空の支払完了通知を本番へ送っていない。
- 本番1440/390幅で匿名ホームの無料1〜5/ロック6〜10を確認し、条件タブと購入案内への遷移、500円買い切り/匿名ログイン案内を確認。横はみ出しなし、画像目視。日本史Chromeの既存ログインを保持し、匿名は別in-app browserで確認した。端末幅変更直後の中間画像は採用せず、更新後の画像を再確認。
- 本番ブラウザーの通信履歴は操作APIで取得できず、本番でAPI呼出0や/me→/examsの時系列を直接採取したとはしない。ホーム/資格処理は前段の実API+合成DBで匿名API0・無料meだけ・有資格者me後examsを確認した同一実装で、最終CIも成功。実カードの支払完了/購入後会員付与と、実Stripe Sandboxの支払/返金/紛争は未確認。

### データ保持・失敗と修正

両本番とも移行台帳10件のchecksumがrepo一致、各300問/利用者2/会員0/決済0は反映前後不変。教材・履歴を書き換えず、seed/新migrationなし。実通知の受信台帳だけが増加。

日本史初回の配信は、files.raw_valueをTOMLへ転記した方法で既存採点JSONの読み込みに失敗し、release_commandで停止、既存稼働版を保持した。同じ内容を0600の非公開ファイルからlocal_pathで渡し、同じimageの再適用で成功。さらに販売切替が保存済み設定の削除済み一時パス参照で停止したため、元の本番採点ファイルをGit/Docker除外のlocal-only/premium-release-20261103/へ保管し、安定した非公開設定で同じimageを再適用して成功。ローカル別版採点ファイルを上書きせず、全VMの注入files完全一致を確認。次回もこの非公開配置を維持する。

### 情報教認の追加接続

通知分離コード5b0b2ba・CI・API配信は完了。既存Stripe接続/署名キーが未設定で公開通知APIがwebhook_unavailableだったため、ユーザーが専用4権限制限キー/既存署名キー/既存PriceのFly登録を追加承認。販売無効を維持する。現在はStripeが専用キー作成時に再本人確認を要求し、本人操作待ち。両ラボの販売状態とは別に管理する。

### この段階の変更ファイル

- frontend/server/services/payment-checkout.ts：各ラボ名と専用の規約/プライバシー/特商法リンク。
- frontend/server-tests/payments.test.ts：ブランド名と専用リンクの回帰。
- STRIPE_INTEGRATION_TODO.md：接続済み項目と実課金の未確認を区別。
- docs/premium-release-20261103.md：本記録。
- docs/workflow/state.json：配信条件の現在地。
- docs/workflow/contexts/service.md：配信結果と根拠へのリンク。
- docs/workflow/handoffs/の新規記録：評価・引き継ぎ（具体名は保存後に追記）。

独立最終レビューpremium_review：両Historyラボの配信・販売設定PASS。各最終CI/Price/設定/ソースhash/全VMと既存注入保持を独立確認。Netlify/実画面/実終了通知/データ保持は親担当の実証を根拠とし、上記の未確認範囲と情報教認の本人確認待ちは継続して区別する。


## 情報教認の追加接続も完了（2026-11-03）

ユーザーの追加承認と再本人確認後、情報教認専用の同じ4権限制限付きAPIキー、既存Webhook署名キー、既存専用PriceをFly tqce-info-practiceへ登録。各一時キーとクリップボードを削除/消去。商品・通知先のURL/対象イベント・画面は変更せず、既存image 5b0b2baを維持。live接続/専用Price/設定不足なし/監査警告なしを確認し、PAID_MEMBERSHIP_ENABLED=false、settings.enabled/audit.sales_enabled=falseを維持した。

設定前に失敗した正規のcheckout.session.expired 3イベントをStripeの再送操作で処理し、すべて200 OK/回復済みを確認。過去4回の失敗試行には同じイベントの重複が含まれ、異なる決済を新規処理したものではない。架空の支払完了を送らず、3イベントの受信台帳だけ追加。Prisma移行台帳3件checksum一致、1000問/利用者1/会員0/決済0は不変。3サービスのPriceは相互に異なる。

両Historyラボは公開・販売設定完了、情報教認は通知接続のみ完了し販売停止を維持。実カード支払いと購入後会員付与の未確認は上の記載どおり。
