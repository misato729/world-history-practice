# GASで再設定メールを送る設定手順

サイトで申請を受け付け、Google Apps Script（GAS）が設定したGoogleアカウントから再設定リンクを送る構成。Resend、SMTP契約、独自ドメイン、受信箱の監視、定期トリガーは不要。

## 1. 送信するGoogleアカウントでプロジェクトを作る

1. 送信元に使うGmailのGoogleアカウントで[Apps Script](https://script.google.com/home)を開き、「新しいプロジェクト」を作る。プロジェクト名は「世界史ラボ 再設定メール」など。
2. 最初の `コード.gs` の内容を、リポジトリの [Code.gs](../frontend/automation/password-reset/Code.gs) 全文で置き換え、保存する。
3. 左の「プロジェクトの設定」（歯車）から「appsscript.json マニフェスト ファイルをエディタで表示する」を有効にする。
4. エディタの `appsscript.json` を、同梱の [appsscript.json](../frontend/automation/password-reset/appsscript.json) で置き換えて保存する。メール送信の権限だけを指定している。

コードとプロジェクトは送信元アカウントの管理下に置く。編集権限を持つ人は送信処理と共有秘密鍵を変更できるため、必要な管理者だけに限定する。

## 2. 共有秘密鍵とサイトURLを設定する

ローカル端末で `openssl rand -hex 32` を1回実行し、出力された64桁の小文字英数字（16進数）を共有秘密鍵に使う。Googleのパスワード・アプリパスワードとは別の値。チャットやGit、ソースコードへ貼らない。

GASの「プロジェクトの設定」→「スクリプト プロパティ」→「スクリプト プロパティを追加」で、次を設定する。

| プロパティ | 値 |
| --- | --- |
| `PASSWORD_RESET_GAS_SECRET` | 生成した64桁の共有秘密鍵 |
| `FRONTEND_URL` | 利用者が開く本番サイトのURL。`https://` から始め、末尾の `/`、パス、クエリを付けない |
| `SITE_NAME` | `世界史ラボ`（省略時もこの名前） |

保存後、エディタ上部の関数選択で `authorizeMail` を選び「実行」。送信元のGoogleアカウントでメール送信の権限を許可する。この関数は設定と送信残数を確認するだけで、メールを送らない。受信箱の読み取り権限は不要。

GASは実行者のGoogleアカウントで権限承認が必要。[Google公式：承認の仕組み](https://developers.google.com/apps-script/guides/services/authorization)、[MailAppの権限](https://developers.google.com/apps-script/reference/mail/mail-app)。

## 3. ウェブアプリとしてデプロイする

1. 右上「デプロイ」→「新しいデプロイ」。種類に「ウェブアプリ」を選ぶ。
2. 「次のユーザーとして実行」は **自分（送信元Googleアカウント）**。
3. 「アクセスできるユーザー」は **全員**（Googleログインを要求しない設定）。サイトのサーバーから呼ぶため必要。署名が正しくない依頼ではメールを送らない。
4. デプロイし、表示された **`https://script.google.com/macros/s/…/exec`** のウェブアプリURLを控える。開発用の `/dev` URLは使わない。

組織のWorkspace制限で「全員」が選べない場合、この方式ではサーバーから直接呼べない。管理ポリシーに従って利用可能な送信元アカウントを選ぶ。

初回以降コードを更新したら「デプロイを管理」→対象の編集→「新バージョン」→デプロイ。保存だけでは既存の `/exec` に反映されない。同じデプロイの更新ならURLを維持できる。[Google公式：ウェブアプリ](https://developers.google.com/apps-script/guides/web)。

## 4. サイト側のサーバー設定

GASを作っただけではサイトの機能は有効にならない。APIサーバーの環境変数に次を設定する。`NUXT_PUBLIC_` を付けず、ブラウザへ公開しない。

| 環境変数 | 値 |
| --- | --- |
| `PASSWORD_RESET_ENABLED` | `true` |
| `PASSWORD_RESET_GAS_URL` | 手順3の `/exec` URL |
| `PASSWORD_RESET_GAS_SECRET` | GASと同じ64桁の共有秘密鍵 |
| `FRONTEND_URL` | GASの設定と同じ本番サイトURL |

このサービスではAPIサーバーはFly.io。設定先はAPI側で、静的フロントの公開設定へ秘密鍵を置かない。ローカルComposeは `.env` を読むが、実際のGASはHTTPSのサイトへリンクする設計。通常の開発・自動テストは合成のGASで行う。

サイトのコード配信と新規SQL `010_password_reset_tokens.sql` の共通 `db:migrate` による適用も必要。通常/本番への適用・配信は、別途その反映依頼の範囲で行う。既存ユーザーや履歴を作り直す作業は不要。

## 5. 有効化後の確認

1. 管理するテスト用の登録メールで、ログイン画面の「パスワードを忘れた場合」→メールを依頼する。
2. Gmailから再設定メールが届き、リンクが本番サイトの `/reset-password#token=…` を指すことを確認する。リンクをログやスクリーンショットへ残さない。
3. リンクを開き、自分で新しいパスワードを設定する。新しい値でログインできること、同じリンクを再利用できないことを確認する。
4. 申請しただけでは旧パスワードが変わらないこと、再申請後は新しいメールのリンクだけを使うことを確認する。

このリポジトリのローカル検証は模擬GAS・隔離DBを使う。実Googleアカウントでの承認・実配送・本番確認はこの手順の有効化後に行う。

## 届かない場合と制限

- 未設定・無効化中は申請時に利用不可を表示する。登録されていないメールには送らず、通常の受付画面は登録済みと同じにする。
- 迷惑メール、GASの実行アカウント/権限、`/exec` と配信版、両側の共有秘密鍵・サイトURL一致を確認する。ブラウザで `/exec` を開いても `{"ok":false}` が返る設計で、送信テストにはならない。
- サイトからの送信処理は15秒まで待ち、失敗時にそのリンクを無効化する。自動再送はしない。送信結果が不明な場合や届いたリンクが使えない場合は、少し待って再申請し、最新のメールを使う。配送は永続キューではなくベストエフォートで、202は受付の意味。
- リンクは発行から30分・1回限り。開いただけでは消費せず、新しいパスワードの保存時に消費する。期限切れ、再申請、本人の通常パスワード変更後は再申請が必要。
- サイト側はIPあたり30回/15分、メールあたり3回/1時間、リンクによる保存30回/15分。GASへの配送はサイト全体20回/UTC日、GASも20試行/UTC日とGoogleの送信残数で制限する。失敗も試行に数える。枠を使い切った場合、GASの残数とサイト側の日次枠の両方が回復してから依頼する。
- Google公式では個人アカウントは送信先100件/日。この実装では他用途の余裕を残すため独自に20件へ絞る。無料枠は変更され得る。[公式の利用上限](https://developers.google.com/apps-script/guides/services/quotas)。
- リンク、メールアドレス、署名付きリクエスト、共有秘密鍵を実行ログへ出さない。共有秘密鍵を交換するときは一時的に `PASSWORD_RESET_ENABLED=false` にし、両側を同じ新しい値へ変更後に有効化する。

HMACは[Utilities](https://developers.google.com/apps-script/reference/utilities/utilities)、設定保管は[PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service)を使用。GASの結果はGoogleの[ContentServiceのリダイレクト](https://developers.google.com/apps-script/guides/content#redirects)を経由し、サイト側はGoogleの所定の宛先だけをGETで追跡する。
