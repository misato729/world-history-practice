# 依存ライブラリのセキュリティ対応

2026年10月24日。Nuxt 4.6.2を維持したまま、次の3件へ対応しています。検証結果は[検証記録](verification.md)を参照してください。

## esbuild

[Windows開発サーバーのファイル読み取り問題](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr)に対し、`frontend/package.json`の`overrides`で、全ての依存経路を修正版0.28.2へ固定しています。Nuxt・Nitro自体はダウングレードしていません。

## serialize-javascript

Docker検証時の再監査で、[関数末尾の終了タグ断片を通じたXSS](https://github.com/yahoo/serialize-javascript/security/advisories/GHSA-m5mm-p8h7-m29v)が追加で報告されました。`@rollup/plugin-terser`の依存範囲`^7.0.3`内で7.1.2から公式修正版7.1.4へ更新しています。関数末尾の`</script`がエスケープされること、通常の関数・Date・拡張年のDate・正規表現・文字列の復元と本番ビルドを検証しています。

## node-forge

[GHSA-86w9-cpqp-85rv / CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv)は、RSA PKCS#1 v1.5署名のDigestInfoに不正な余剰データがあっても受理する問題です。確認時点で公式npmの最新版は1.4.0で、修正版は未公開です。

そのため、上流の未マージの[PR #1159](https://github.com/digitalbazaar/forge/pull/1159)、commit `db05494352dd3c9a5a07c5270333dcc78866cad2`の`lib/rsa.js`修正だけをバックポートしています。これは公式リリース済みの修正ではありません。要素数だけを検査する修正より広く、正規のDER表現と比較して、余分な要素・NULL内のデータ・非最小長表現を拒否します。通常のNULL付き／NULL省略形の互換性を維持します。

- パッチは`frontend/patches/node-forge-1.4.0.patch`、適用処理は`frontend/scripts/patch-node-forge.mjs`です。
- 公開版1.4.0の原本、修正結果、パッチデータのSHA-256を固定しています。結果のSHA-256は上記commitのソースと一致します。
- ロックファイル上のnode-forgeが、想定した単一の依存であることも検査します。未知の版、内容、追加の入れ子依存があれば、上書きや無視をせず停止します。
- 再適用は安全にスキップします。`--check`は書き換えず、適用済みであることだけを検証します。
- パッチの改行は`.gitattributes`でLFに固定し、Windowsのチェックアウトでも照合値を保ちます。

適用・検証は次の経路に組み込まれています。

- 通常の`npm ci` / `npm install`の`postinstall`で適用。
- `build`・`dev`・`generate`・`preview`の前に適用済みか検証。
- Dockerビルドでは`npm ci --ignore-scripts`の後に明示的に適用。
- DockerのENTRYPOINTでは、既存の依存ボリュームを含めて毎回検証・必要時に適用。依存準備の完了マーカーは修正成功後に記録。
- CIでは`security:check`と通常のテストを実行。

手動で`--ignore-scripts`を指定してインストールした場合は、開発・ビルド前に以下を実行してください。

```bash
cd frontend
npm run security:patch
npm run security:check
npm test
```

## 回帰検証と監査表示

`frontend/tests/dependencySecurity.test.ts`は、正確な公開版1.4.0を一時フォルダ内だけに復元して比較します。公開版が受理する30通りの不正な署名を修正版が拒否し、SHA-256/384/512とRSA指数3/65537の正常署名、Node/OpenSSLとの相互運用、ForgeのNULL省略形、従来の末尾データ拒否を確認します。検証用の秘密鍵・メッセージは全て合成データです。

修正後も`npm audit`はnode-forgeの公開版番号1.4.0を見てHigh 7件を報告します。この7件は同じ問題の依存元への伝播を含みます。Lowのesbuild・serialize-javascript指摘は解消しています。版番号の偽装・アドバイザリの非表示・監査の無効化は行っていません。監査0件という状態ではありません。

`npm audit`だけで修正の有無を判定せず、`npm run security:check`による実ファイルの照合と、回帰テストの結果も併せて確認してください。別の脆弱性が報告された場合、このバックポートで対応済みと判断しないでください。

`frontend/tests/dependencyCompatibility.test.ts`では、listhenによるHTTPS証明書生成・一時保存後の再利用、TLSの信頼検証・ホスト名検証、esbuildによる変換と実行も確認しています。OSやグローバルの証明書信頼設定は変更しません。

## 公式修正版への切り替え

公式修正版が公開されたら、上流の修正内容と依存元の対応を確認して更新します。バージョン変更時にこのパッチャーが停止するのは意図した動作です。新しい版で同じ回帰テストと両サービスの機能・型検査・ビルドを確認し、バックポートの適用処理・ガード・パッチデータを整理してください。検査を単に無効化して更新を通さないでください。
