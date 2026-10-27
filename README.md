# Ai Love GPU — Official Website

ALGの紹介・技術記事・活動報告・プロジェクトを公開する静的サイトです。仕様は[技術仕様書](docs/spec.md)、実装時の決定は[実装メモ](docs/IMPLEMENTATION.md)を参照してください。

## 開発

Node.js **24.21.0**とBun **1.4.4**を使用します。Windows・Linux・macOSで同じバージョンを用意してください。

```sh
bun ci
bun run dev
```

`http://localhost:4321/`を開きます。初回導入や依存関係の変更には`bun install`を使用し、変更した`bun.lock`をコミットします。

| コマンド                    | 内容                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| `bun run dev`               | ローカル開発。下書き・将来記事も確認可能                             |
| `bun run build`             | 静的生成、日本語フォント最適化、検索インデックス生成、配信成果物検証 |
| `bun run preview`           | Astroで生成サイトを確認                                              |
| `bun run check`             | Astro・TypeScriptの型検査                                            |
| `bun run lint`              | Biomeによるlint・整形検査とMDX専用検査                               |
| `bun run format`            | 整形                                                                 |
| `bun run format:check`      | 整形検査                                                             |
| `bun test`                  | 公開ポリシーの単体テスト                                             |
| `bun run test:content`      | 一時ディレクトリで不正コンテンツ・下書き除外を統合検証               |
| `bun run test:e2e`          | ビルド済みサイトのブラウザテスト                                     |
| `bun run icons:build`       | SVGからfaviconのPNG・ICO・Apple Touch Iconを再生成                   |
| `bun run audit:performance` | 代表3ページのモバイルLighthouse測定                                  |

日本語フォントはビルドした公開HTMLの使用文字に合わせて縮小し、サイト内から配信します。外部フォントサービスへの通信はありません。開発時は起動時にフォントを用意するため、新しい文字が表示されない場合は開発サーバーを再起動してください。

検索はビルド成果物を使います。`dev`では検索インデックスが生成されないため、検索の確認には`build`後に`preview`を使用してください。

Cloudflare配信の確認は`bun run build`後に`bun run preview:cloudflare`（ポート8787）を使用します。`bun run test:e2e`もWranglerのローカル配信を使用します。Workers Buildsは`bun ci && bun run build:cloudflare`で生成し、`bunx wrangler deploy`で本番公開、`bunx wrangler preview`でブランチプレビューを作成します。`build:cloudflare`には`WORKERS_CI_BRANCH`が必須です。

`bun run deploy`はビルド済みの`dist/`を本番公開します。通常はWorkers Buildsによる自動公開を使用してください。手動公開・独自ドメイン設定は[デプロイ手順](docs/DEPLOYMENT.md)を参照してください。

## Linter・Formatter

標準ツールはBiome 2.6.3です。`bun run lint`でlint・整形・import順を検査し、`bun run format`で整形します。`bun run format:check`は整形だけを検査します。

JavaScript・TypeScript・Astro・CSS・JSON・YAML・MarkdownをBiomeで処理します。Astroは`html.experimentalFullSupportEnabled`とHTML formatterを有効化し、マークアップも対象にしています。Tailwind CSS v4のディレクティブも有効です。

BiomeはMDX未対応のため、MDXだけはPrettierで整形し、markdownlint-cli2で構文検査します。`format`・`format:check`・`lint`は、この補助処理も含めて実行します。`prettier-plugin-astro`は使用しません。

設定は`biome.json`で管理し、Git除外対象の生成物と、別管理の`docs/spec.md`・MDXを対象から除外しています。エディターでもBiomeを標準formatterにし、MDXだけPrettierを使用してください。

## 構成

- `src/content/`：Markdown・MDXの記事・プロジェクト
- `src/data/`：著者、タグ、サイト情報、確認済みの連絡先
- `src/content.config.ts`：コレクションとスキーマ
- `src/components/`・`src/layouts/`・`src/styles/`：共通UIとデザイントークン
- `src/pages/`：静的・動的ルート、RSS、robots.txt
- `scripts/`・`tests/`：生成物検査とテスト
- `public/`：公開用ロゴ、favicon、標準OGP画像、Cloudflare配信設定
- `design/brand/originals/`：公開しないロゴ原本。[素材の管理](design/brand/README.md)を参照

## 開発プレビューと正式公開

`src/data/site.ts`は`preview: false`で、本番の検索掲載を許可します。サンプル記事・プロジェクトは`draft: true`にして本番のHTML・検索・RSS・サイトマップから除外しています。機能ブランチは引き続きrobotsとメタタグで検索を拒否します。これは閲覧制限ではありません。

Cloudflare本番のビルド環境では`SITE_RELEASE=1`を設定してください。不備があれば生成物検証が失敗します。既存の公式GitHubリポジトリを案内していますが、入部・見学用の連絡先や募集条件は確定後に掲載します。

公式リポジトリは[ALG-SIT/website](https://github.com/ALG-SIT/website)です。Cloudflareプロジェクト、DNS、実在するCODEOWNERSは未設定です。サイト公開・保護ルールの適用には管理担当者によるアカウント設定が必要です。

## 運用文書

- [記事投稿の流れ](CONTRIBUTING.md)
- [コンテンツガイド](docs/CONTENT_GUIDE.md)
- [デプロイ手順](docs/DEPLOYMENT.md)
- [運用・引き継ぎ](docs/OPERATIONS.md)
