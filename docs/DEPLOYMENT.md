# Cloudflare Pagesへの公開

## 前提

GitHub OrganizationとCloudflare・DNSの管理権限が必要です。ローカルのサイト実装とは別に、管理責任者が次の設定を行います。秘密情報をリポジトリへ書き込まないでください。

## GitHub

1. Organizationに`website`リポジトリを作成し、既存のローカル履歴を接続・Pushします。
2. `.github/CODEOWNERS`の例を実在するチーム名に置換し、有効化します。
3. `main`のルールセットで直接Pushを制限し、PR・1名以上の承認・Code Owner承認・`Quality checks`の成功を必須にします。
4. 管理者のバイパスも運用方針に沿って制限します。
5. GitHub Actions、Dependabot、管理者の多要素認証を確認します。

## Pages

Git連携でプロジェクトを作成します。WorkersやDirect Upload方式には変更しません。

| 設定              | 値                        |
| ----------------- | ------------------------- |
| プロジェクト      | `alg-website`             |
| リポジトリ        | Organizationの`website`   |
| 本番ブランチ      | `main`                    |
| Framework preset  | Astro                     |
| Build system      | v3                        |
| Root              | `/`                       |
| Build command     | `bun ci && bun run build` |
| Output directory  | `dist`                    |
| Production deploy | 有効                      |
| Preview deploy    | 有効                      |

本番・プレビュー両方に次を設定します。

| 環境変数                   | 値        |
| -------------------------- | --------- |
| `BUN_VERSION`              | `1.4.4`   |
| `NODE_VERSION`             | `24.21.0` |
| `SKIP_DEPENDENCY_INSTALL`  | `1`       |
| `ASTRO_TELEMETRY_DISABLED` | `1`       |

正式公開する本番環境だけに`SITE_RELEASE=1`を追加します。プレビュー環境では未設定にします。`CF_PAGES_BRANCH`はCloudflareが設定する値を使用します。`main`以外のプレビュービルドにはnoindexとrobotsの全拒否を付けます。プレビューは非公開ストレージではないため、機密情報を含めないでください。

## 正式コンテンツへの差し替え

- ロゴ、紹介文、活動情報、参加条件、連絡先、SNSを確認する。
- サンプル記事・プロジェクトを正式内容へ置き換えるか削除する。
- OGP画像とfaviconを確認する。favicon原本を変更した場合は`bun run icons:build`で派生画像も再生成する。
- 写真・プロフィールの掲載許可、大学との関係についての表現を確認する。
- `src/data/site.ts`の連絡先を設定し、`preview`を`false`へ変更する。
- 入部案内・概要ページなどの「準備中」を確認済みの情報に更新する。
- ローカルでも`SITE_RELEASE=1 bun run build`が成功することを確認する。Windows PowerShellでは`$env:SITE_RELEASE = '1'`を設定してからビルドする。

公開検証はプレビュー設定・連絡先未設定・既知のサンプルを検出します。活動文章の正確性・掲載許可は担当者が確認します。

## ドメイン

1. `alg-sit.club`のCloudflare DNS管理状態を確認します。
2. PagesのCustom domainsに`alg-sit.club`を追加し、DNSと証明書の有効化を待ちます。
3. `www.alg-sit.club`も設定し、`public/_redirects`の301リダイレクトを検証します。必要に応じてCloudflareのRedirect Ruleでも同じ転送を設定します。
4. HTTPS、末尾スラッシュ、Canonical、RSS、サイトマップ、404のHTTPステータスを確認します。
5. Pages既定の`*.pages.dev`の本番URLは、CloudflareのRedirect Ruleで独自ドメインへ転送し、PRプレビューのホスト名は対象外にします。

## リリース確認

記事変更のPRを作り、CIとプレビューが成功することを確認します。`main`へマージした後、独自ドメインで反映を確認します。不正なFrontmatterのテストブランチではCIとPagesビルドが失敗し、本番の正常版が維持されることを確認します。

Cloudflare PagesはCIと独立してビルドするため、mainへの取り込みを必須チェックで保護してください。公開後の問題はPagesのロールバック、またはGitのRevertで復旧します。詳細は[運用手順](OPERATIONS.md)を参照してください。

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
