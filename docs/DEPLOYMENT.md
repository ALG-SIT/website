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
- OGP画像とfaviconを必要に応じて正式ロゴに置き換える。
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
