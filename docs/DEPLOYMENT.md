# Cloudflare Workers + Static Assetsへの公開

## 前提

GitHub OrganizationとCloudflare・DNSの管理権限が必要です。ローカルのサイト実装とは別に、管理責任者が次の設定を行います。秘密情報をリポジトリへ書き込まないでください。

## GitHub

1. Organizationに`website`リポジトリを作成し、既存のローカル履歴を接続・Pushします。
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

配信対象は`wrangler.jsonc`の`assets.directory: ./dist`で指定します。Astroの静的生成を維持し、Workerスクリプト・アセットbinding・Cloudflareアダプターは追加しません。404は`404-page`、HTMLは`force-trailing-slash`で配信します。`preview_urls: true`と`previews: {}`でプレビューを構成します。旧方式のプレビューを使用する既存Workerでは、Cloudflareの案内に従ってWorker Previewsへ切り替えてください。

次はWorkers Buildsの**ビルド環境変数**として設定します。Worker実行時の変数とは別です。

| 環境変数                   | 値        |
| -------------------------- | --------- |
| `BUN_VERSION`              | `1.4.4`   |
| `NODE_VERSION`             | `24.21.0` |
| `SKIP_DEPENDENCY_INSTALL`  | `1`       |
| `ASTRO_TELEMETRY_DISABLED` | `1`       |

`WORKERS_CI_BRANCH`はWorkers Buildsが設定する値を使用し、手動で固定しません。`build:cloudflare`はこの値が空なら失敗します。main以外では子プロセスの`SITE_RELEASE`を`0`にしてビルドし、HTMLにnoindex・nofollow、robotsに全拒否を付けます。Pages専用の環境変数には対応しません。

正式公開の準備が完了したらビルド環境変数に`SITE_RELEASE=1`を設定します。mainでは公開検証を実行し、機能ブランチでは同じ変数が渡されても公開検証を無効にしてプレビューを生成します。`site.preview: true`の間は本番も検索拒否になります。プレビューは閲覧制限ではありません。

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

## Pagesからの切り替えとドメイン

1. `alg-sit.club`のネームサーバーがCloudflareで管理されていることを確認します。Workers Custom Domainsの前提です。
2. 既存Pagesを残した状態でWorkers Buildsを設定し、WorkersのURLで表示、日本語検索、RSS、サイトマップ、セキュリティヘッダー、404、末尾スラッシュ転送を確認します。
3. 記事変更のPRでGitHubの`Quality checks`とWorkersのプレビューが成功すること、プレビューのnoindex・robots全拒否を確認します。不正なFrontmatterではビルドが失敗し、本番の正常版が維持されることも確認します。
4. 切り替え時にPages側の独自ドメインの関連付けと競合するDNSレコードを整理し、WorkersのSettings > Domains & Routesで`alg-sit.club`と`www.alg-sit.club`をCustom Domainに設定します。証明書の有効化とHTTPSを確認します。
5. `public/_redirects`によるwwwから正規ホストへの301転送、Canonical、RSS、サイトマップ、存在しないURLの404ステータスを確認します。既存のRedirect Ruleがある場合は競合を解消します。
6. mainへのマージから独自ドメインへの反映までを確認し、Pagesの自動デプロイを停止します。Pagesプロジェクトはこの移行では削除しません。

`_headers`と`_redirects`はStatic Assetsでも使用します。本番の`workers.dev` URLとプレビューURLは別に確認し、プレビューまで独自ドメインへ転送するルールを設定しないでください。

## リリース・復旧

mainへの取り込みは引き続き必須チェックで保護します。Workers BuildsはGitHub Actionsの終了を待つ仕組みではないため、PRレビューと必須チェックを省略しません。

公開後の問題はWorkersの正常版へのロールバック、またはGit Revertで復旧します。Pagesへ切り戻す場合は、移行前のコミットをPagesで再デプロイし、独自ドメインとDNSを元に戻します。移行後のコードはPagesのブランチ変数を参照しません。詳細は[運用手順](OPERATIONS.md)を参照してください。

設定仕様は[公式移行ガイド](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)、[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[ビルド環境](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)を参照してください。

## 検索公開の確認

今回のSEO改善だけでは`preview: true`を解除しません。正式コンテンツと掲載許可の確認が終わってから、既存の正式公開手順で検索を解禁します。

1. `preview: false`にし、確認済みの連絡先を設定して、`SITE_RELEASE=1 bun run build`が成功することを確認します。本番ブランチはmain、プレビューブランチは引き続き検索拒否です。
2. 本番でHTTPS、wwwから正規ホストへの301転送、末尾スラッシュへの転送を確認します。静的サイトの転送はホスティング側の挙動も確認してください。
3. 通常ページが200でnoindexを含まないこと、存在しないURLが404のHTTPステータスでnoindexを含むことを確認します。robots.txtは`Allow: /`で、正規ドメインのサイトマップを参照する必要があります。
4. favicon各形式・OGP画像・RSS・サイトマップが200で取得できること、canonicalとog:urlが正規URLに一致することを確認します。サイトマップに404・下書き・未来記事がないことも確認します。
5. [Schema Markup Validator](https://validator.schema.org/)へ生成HTMLを入力し、WebSite・Organizationを検証します。[Rich Results Test](https://search.google.com/test/rich-results)では記事とパンくずを検証します。WebSiteのサイト名はRich Results Testの対象外です。公開前のnoindex・robots制限による警告とデータ自体のエラーは区別します。
6. 管理担当者が[Google Search Console](https://search.google.com/search-console)のドメインプロパティを作成し、DNSで所有権を確認します。DNSレコードや確認トークンをリポジトリへ保存する必要はありません。
7. Search Consoleで`https://alg-sit.club/sitemap-index.xml`を送信し、トップ・代表記事のURL検査で取得可能なことを確認して、インデックス登録をリクエストします。公開後はページのインデックス登録・サイトマップ処理結果・構造化データの問題を確認します。

favicon、サイト名、リッチリザルトの表示や反映時期は検索エンジン側の判断によります。プレビュー環境のLighthouse SEOスコアを上げるために検索拒否を解除しないでください。
