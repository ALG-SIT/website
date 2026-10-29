# Cloudflare Workers + Static Assetsへの公開

## 現在の公開状況

公式サイトは[https://alg-sit.club/](https://alg-sit.club/)で公開中です。正規URLと`preview: false`は`src/data/site.ts`で管理しています。以下の初期設定手順は再構築・引き継ぎ用です。管理画面の設定値は実環境で確認してください。

## 前提

GitHub OrganizationとCloudflare・DNSの管理権限が必要です。ローカルのサイト実装とは別に、管理責任者が次の設定を行います。秘密情報をリポジトリへ書き込まないでください。

## GitHub

1. 既存の[ALG-SIT/website](https://github.com/ALG-SIT/website)を使用します。再構築時はリモートと履歴を確認します。
2. `.github/CODEOWNERS`の例を実在するチーム名に置換し、有効化します。
3. `main`のルールセットで直接Pushを制限し、PR・1名以上の承認・Code Owner承認・`Quality checks`の成功を必須にします。
4. 管理者のバイパスも運用方針に沿って制限します。
5. GitHub Actions、Dependabot、管理者の多要素認証を確認します。

## Workers Builds

Workersを新規作成し、Workers BuildsでGitHubリポジトリを接続します。GitHub Actionsは品質検査を担当し、Workers Buildsは独立してビルド・公開します。`wrangler.jsonc`のWorker名とCloudflare側の名前を一致させてください。

| 設定                   | 値                                   |
| ---------------------- | ------------------------------------ |
| Worker名               | `alg-website`                        |
| リポジトリ             | `ALG-SIT/website`                    |
| 本番ブランチ           | `main`                               |
| Root directory         | リポジトリ直下                       |
| Build command          | `bun ci && bun run build:cloudflare` |
| Deploy command         | `bunx wrangler deploy`               |
| Preview command        | `bunx wrangler preview`              |
| 本番・プレビュービルド | 有効                                 |

配信対象は`wrangler.jsonc`の`assets.directory: ./dist`で指定します。Astroの静的生成を維持し、Workerスクリプト・アセットbinding・Cloudflareアダプターは追加しません。404は`404-page`、HTMLは`force-trailing-slash`で配信します。`preview_urls: true`と`previews: {}`でプレビューを構成します。

次はWorkers Buildsの**ビルド環境変数**として設定します。Worker実行時の変数とは別です。

| 環境変数                   | 値        |
| -------------------------- | --------- |
| `BUN_VERSION`              | `1.4.4`   |
| `NODE_VERSION`             | `24.21.0` |
| `SKIP_DEPENDENCY_INSTALL`  | `1`       |
| `ASTRO_TELEMETRY_DISABLED` | `1`       |

`WORKERS_CI_BRANCH`はWorkers Buildsが設定する値を使用し、手動で固定しません。`build:cloudflare`はこの値が空なら失敗します。main以外では子プロセスの`SITE_RELEASE`を`0`にしてビルドし、HTMLにnoindex・nofollow、robotsに全拒否を付けます。

本番の公開検証を有効にするにはビルド環境変数に`SITE_RELEASE=1`を設定します。mainでは公開検証を実行し、機能ブランチでは同じ変数が渡されても公開検証を無効にしてプレビューを生成します。`site.preview: true`の間は本番も検索拒否になります。プレビューは閲覧制限ではありません。

ローカルでは`bun run build`後に`bun run preview:cloudflare`を実行し、`http://localhost:8787/`で配信を確認します。`bun run preview`はAstroによる表示確認用です。`bun run deploy`は既存の`dist/`を本番へ公開するため、手動公開でも必ず先に対象ブランチと環境変数を設定して`build:cloudflare`を成功させてください。通常の公開はWorkers Buildsに任せます。

## 正式コンテンツへの差し替え

- ロゴ、紹介文、活動情報、参加条件、連絡先、SNSを確認する。
- サンプル記事・プロジェクトを正式内容へ置き換えるか削除する。
- OGP画像とfaviconを確認する。favicon原本を変更した場合は`bun run icons:build`で派生画像も再生成する。
- 写真・プロフィールの掲載許可、大学との関係についての表現を確認する。
- `src/data/site.ts`の連絡先を設定し、`preview`を`false`へ変更する。
- 入部案内・概要ページなどの「準備中」を確認済みの情報に更新する。
- ローカルでも`SITE_RELEASE=1 bun run build`が成功することを確認する。Windows PowerShellでは`$env:SITE_RELEASE = '1'`を設定してからビルドする。

公開検証はプレビュー設定・連絡先未設定・既知のサンプルを検出します。活動文章の正確性・掲載許可は担当者が確認します。

## ドメイン設定・再構築時の確認

1. `alg-sit.club`のネームサーバーがCloudflareで管理されていることを確認します。Workers Custom Domainsの前提です。
2. Workers Buildsを設定し、WorkersのURLで表示、日本語検索、RSS、サイトマップ、セキュリティヘッダー、404、末尾スラッシュ転送を確認します。
3. 記事変更のPRでGitHubの`Quality checks`とWorkersのプレビューが成功すること、プレビューのnoindex・robots全拒否を確認します。不正なFrontmatterではビルドが失敗し、本番の正常版が維持されることも確認します。
4. WorkersのSettings > Domains & Routesで`alg-sit.club`と`www.alg-sit.club`をCustom Domainに設定します。証明書の有効化とHTTPSを確認します。
5. Canonical、RSS、サイトマップ、存在しないURLの404ステータスを確認します。
6. mainへのマージから独自ドメインへの自動公開までを確認します。

`_headers`はStatic Assetsでも使用します。`_redirects`によるwwwから正規ホストへの転送は無効化しています。本番の`workers.dev` URLとプレビューURLは別に確認してください。

## リリース・復旧

mainへの取り込みは引き続き必須チェックで保護します。Workers BuildsはGitHub Actionsの終了を待つ仕組みではないため、PRレビューと必須チェックを省略しません。

公開後の問題はWorkersの正常版へのロールバック、またはGit Revertで復旧します。詳細は[運用手順](OPERATIONS.md)を参照してください。

設定仕様は[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[ビルド環境](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)を参照してください。

## 検索公開の確認

現在は`preview: false`で本番の検索を許可し、サンプル5ページは下書きとして本番の成果物から除外しています。公式GitHubリポジトリへの案内を掲載しています。募集用の連絡先・条件は確定後に更新してください。

1. `preview: false`にし、確認済みの連絡先を設定して、`SITE_RELEASE=1 bun run build`が成功することを確認します。本番ブランチはmain、プレビューブランチは引き続き検索拒否です。
2. 本番でHTTPS、末尾スラッシュへの転送を確認します。静的サイトの転送はホスティング側の挙動も確認してください。
3. 通常ページが200でnoindexを含まないこと、存在しないURLが404のHTTPステータスでnoindexを含むことを確認します。robots.txtは`Allow: /`で、正規ドメインのサイトマップを参照する必要があります。
4. favicon各形式・OGP画像・RSS・サイトマップが200で取得できること、canonicalとog:urlが正規URLに一致することを確認します。サイトマップに404・下書き・未来記事がないことも確認します。
5. [Schema Markup Validator](https://validator.schema.org/)へ生成HTMLを入力し、WebSite・Organizationを検証します。[Rich Results Test](https://search.google.com/test/rich-results)では記事とパンくずを検証します。WebSiteのサイト名はRich Results Testの対象外です。公開前のnoindex・robots制限による警告とデータ自体のエラーは区別します。
6. 管理担当者が[Google Search Console](https://search.google.com/search-console)のドメインプロパティを作成し、DNSで所有権を確認します。DNSレコードや確認トークンをリポジトリへ保存する必要はありません。
7. Search Consoleで`https://alg-sit.club/sitemap-index.xml`を送信し、トップ・代表記事のURL検査で取得可能なことを確認して、インデックス登録をリクエストします。公開後はページのインデックス登録・サイトマップ処理結果・構造化データの問題を確認します。

favicon、サイト名、リッチリザルトの表示や反映時期は検索エンジン側の判断によります。プレビュー環境のLighthouse SEOスコアを上げるために検索拒否を解除しないでください。

## HTTPS・アクセス計測・アセット配信

- ドメインのSSL/TLS > Edge CertificatesでAlways Use HTTPSを有効にします。HTTPへのアクセスがHTTPSへ転送され、パス・クエリが保持されることを確認してください。この設定はコードのデプロイでは有効になりません。
- `_headers`のCSPはCloudflare Web Analyticsのスクリプト配信元と送信先を許可します。公開後、`beacon.min.js`の読み込みと`/cdn-cgi/rum`への送信を確認してください。ローカル配信にはCloudflareの自動スクリプト挿入はありません。
- 本番の日本語フォントはビルド時に公開HTMLからサブセット化し、内容のハッシュを含む`/_astro/`のURLへ置き換えます。ロゴの派生画像とともに、既存の1年間のimmutableキャッシュを利用します。開発用フォントの固定URLは本番HTMLには残しません。
