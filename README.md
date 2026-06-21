# ICカード番号登録サイト

メールアドレス・パスワード・ICカード番号を登録し、メール認証（URLクリック）で登録を完了するサイトです。スマートフォン表示に最適化しています。

## セットアップ

1. 依存パッケージをインストール
   ```
   npm install
   ```

2. `.env.example` をコピーして `.env` を作成し、値を設定
   ```
   cp .env.example .env
   ```

   - `GMAIL_USER`: 送信元のGmailアドレス
   - `GMAIL_APP_PASSWORD`: Googleアカウントの「アプリパスワード」（2段階認証を有効化した上で発行）
     https://myaccount.google.com/apppasswords で発行できます。通常のログインパスワードは使えません。
   - `BASE_URL`: 本番運用時は実際の公開URL（例: https://example.com）に変更してください。

3. サーバー起動
   ```
   node server.js
   ```

4. ブラウザで `http://localhost:3000` を開く

## 仕組み

- 登録フォーム送信 → サーバーがパスワードをハッシュ化して未認証状態でDB保存 → 確認メール（ICカード番号＋認証URL）を送信
- メール内のURLをクリック → `/verify/:token` でトークンを検証 → 有効なら `is_verified = 1` に更新し完了画面を表示
- 認証用URLの有効期限は24時間です。期限切れの場合は再登録が必要です。

## 注意事項

- ICカード番号は平文でメール送信・DB保存されます。本番運用ではICカード番号の取り扱いについて、暗号化やマスキングなど追加のセキュリティ対策を検討してください。
- 本実装はこの環境にネイティブビルド環境（Visual Studio Build Tools）がなかったため、`better-sqlite3`ではなく依存なしの自前JSONファイルDB（`db.js`、`data.json`）と`bcryptjs`（純JS実装）を使用しています。
- このPCではNorton AntivirusのHTTPS検査機能によりnpmのSSL証明書検証が失敗する問題がありました。`.certs/norton-root.pem`にエクスポートしたNorton証明書を`NODE_EXTRA_CA_CERTS`で指定することで回避しています（このリポジトリ固有の対応で、`.gitignore`済みです）。
- さらにNortonの「Mail Shield」機能がGmail SMTPの465番ポート（暗黒TLS）への直接接続を妨害したため、587番ポート＋STARTTLSで接続するように`mailer.js`を実装しています。他の環境でNorton等のメール保護機能が無い場合も587番ポートは問題なく動作します。
