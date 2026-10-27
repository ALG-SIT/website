# Ai Love GPU 公式Webサイト 技術仕様書

**文書バージョン：** 1.0.1
**策定日：** 2026年10月25日
**プロジェクト名：** ALG Official Website
**対象ドメイン：** https://alg-sit.club
**開発主体：** Ai Love GPU（ALG）
**ステータス：** 初期開発向け基本仕様確定版

---

## 1. プロジェクト概要

### 1.1 目的

Ai Love GPU（以下、ALG）の活動内容、技術的な取り組み、開発成果、入部案内などを公開する公式Webサイトを構築する。

技術系サークルとして、部員が執筆した技術記事やプロジェクトの成果を継続的に公開できることを重視する。

### 1.2 基本方針

1. オープンな技術情報発信を目的とした静的Webサイトとする。
2. GitHubでソースコードとコンテンツを一元管理する。
3. 記事投稿にはMarkdownを標準として使用する。
4. 複雑なコンテンツにはMDXを使用できるようにする。
5. GitHubの`main`ブランチの更新を契機に自動的に公開する。
6. バックエンドやデータベースを使用しない構成とする。
7. サイト全体をレスポンシブデザインで実装する。
8. 将来の機能追加、メンテナンス、担当者交代を容易にする。

### 1.3 対象範囲

初期バージョンでは、以下を実装する。

- サークル公式情報の掲載
- 技術記事の公開・一覧表示
- 活動報告の公開
- プロジェクト紹介
- 記事のタグ・カテゴリー分類
- 記事検索
- 著者情報の表示
- GitHubを使用した記事投稿ワークフロー
- SEO、RSS、サイトマップ
- GitHub連携による自動デプロイ

会員認証、コメント、投稿管理画面、データベース、独自APIは対象外とする。

---

## 2. 技術スタック

| 分類 | 採用技術 | 用途 |
|---|---|---|
| フレームワーク | Astro 7系 | Webサイト構築 |
| 言語 | TypeScript | アプリケーション実装 |
| パッケージ管理 | Bun | 依存関係管理 |
| ビルド | Astro SSG | 静的HTML生成 |
| コンテンツ管理 | Astro Content Collections | 記事・データ管理 |
| Markdown処理 | Astro標準 Sätteri | Markdownレンダリング |
| 拡張Markdown | @astrojs/mdx | MDXサポート |
| データ検証 | Zod（Astro経由） | Frontmatter検証 |
| スタイル | Tailwind CSS v4 | UI構築 |
| 検索 | Pagefind | 静的全文検索 |
| シンタックスハイライト | Astro標準機能 | コード表示 |
| RSS | @astrojs/rss | 記事配信 |
| Sitemap | @astrojs/sitemap | サイトマップ生成 |
| 画像処理 | astro:assets | 画像最適化 |
| 型チェック | @astrojs/check | Astro・TypeScript検証 |
| コード検査 | Biome | コード・Astro・CSS等の検査 |
| フォーマット | Biome（MDXのみPrettier） | コード・Astro・Markdown等の整形 |
| Markdown検査 | Biome / markdownlint-cli2（MDXのみ） | 記事品質検査 |
| ソース管理 | GitHub | Gitリポジトリ |
| CI | GitHub Actions | 品質検証 |
| CD・ホスティング | Cloudflare Workers + Static Assets | 自動ビルド・公開 |
| DNS | Cloudflare DNS | ドメイン管理 |

バージョン管理は原則として各ライブラリの安定版を使用する。導入時に互換性を検証した組み合わせを`bun.lock`に固定し、Cloudflare Workers + Static AssetsとGitHub Actionsでも同じBunバージョンを使用する。

## 3. アーキテクチャ

### 3.1 実行方式

Astroの`output: 'static'`を採用する。

すべての公開ページをビルド時に静的生成する。Cloudflare Workers + Static Assetsでは生成済みのHTML、CSS、JavaScript、画像などを配信する。

以下は初期構成では使用しない。

- Server-Side Rendering（SSR）
- Astro Server Islands
- Cloudflare Pages Functions
- Cloudflare Workersによる動的処理
- Cloudflare D1
- Cloudflare R2
- 外部CMS

### 3.2 コンテンツ管理

コンテンツの正本はGitHubリポジトリとする。

Markdown、MDX、著者情報、プロジェクト情報をGitでバージョン管理し、AstroのContent Collectionsを介して取得する。

公開Webサイトには編集・保存機能を実装しない。

### 3.3 Markdownレンダリング

Astro 7系の標準MarkdownプロセッサであるSätteriを採用する。

GitHub Flavored Markdown（GFM）を有効にし、以下に対応する。

- 見出し、段落、リンク、画像
- テーブル、リスト、チェックリスト
- 引用、脚注
- コードブロック
- シンタックスハイライト
- 記事内アンカーリンク

remark/rehypeプラグインへの依存を初期段階では導入しない。必要な機能がSätteriで実現できない場合に限り、Unifiedへの切り替えを検討する。

### 3.4 クライアントサイドJavaScript

原則として静的HTMLとCSSで表示する。

検索、モバイルメニュー、テーマ切り替えなど、必要な機能にだけJavaScriptを利用する。

React、Vue、SvelteなどのUIフレームワークは初期状態では導入しない。

---

## 4. URLとサイト構造

### 4.1 URL設計

正規URLは`https://alg-sit.club`とする。

`www.alg-sit.club`は正規ドメインへ恒久的にリダイレクトする。

末尾のスラッシュを統一し、ページURLには原則として`/`を付与する。

### 4.2 ページ一覧

| URL | 内容 | 初期実装 |
|---|---|---|
| `/` | トップページ | 必須 |
| `/about/` | サークル概要 | 必須 |
| `/blog/` | 記事一覧 | 必須 |
| `/blog/{slug}/` | 記事詳細 | 必須 |
| `/tags/{slug}/` | タグ別記事一覧 | 必須 |
| `/projects/` | プロジェクト一覧 | 必須 |
| `/projects/{slug}/` | プロジェクト詳細 | 必須 |
| `/join/` | 入部案内 | 必須 |
| `/contact/` | 連絡先・SNS | 必須 |
| `/privacy/` | プライバシーポリシー | 必須 |
| `/rss.xml` | RSSフィード | 必須 |
| `/robots.txt` | クローラー設定 | 必須 |
| `/sitemap-index.xml` | サイトマップ | 必須 |
| `/404.html` | 404エラーページ | 必須 |

カテゴリー別記事一覧は、初期段階では`/blog/`内のフィルターで提供してもよい。別URLの生成は必要性に応じて追加する。

### 4.3 トップページ

次の要素を表示する。

1. ALGの名称、ロゴ、簡潔な活動紹介
2. サークルについての説明と詳細ページへのリンク
3. 最新の公開記事
4. 注目プロジェクト
5. 活動内容の紹介
6. 入部案内へのリンク
7. GitHubなどの公式SNSへのリンク

トップページはサークルの活動を理解してもらうための入口とし、記事の内容を過剰に表示しない。

### 4.4 ブログ

記事一覧は公開日時の降順とする。

記事カードには以下を表示する。

- 記事タイトル
- 概要
- カバー画像（設定されている場合）
- 公開日
- 著者
- カテゴリー
- タグ

記事詳細には、本文、著者情報、公開日、更新日、目次、関連記事への導線を用意する。

目次は記事の見出しから生成し、記事内の対応する見出しへ移動できるようにする。

---

## 5. Content Collections設計

### 5.1 コレクション

初期段階では3つのコレクションを定義する。

| Collection | データ元 | 用途 |
|---|---|---|
| `blog` | Markdown / MDX | 技術記事・活動報告・お知らせ |
| `projects` | Markdown / MDX | プロジェクト紹介 |
| `authors` | JSON | 著者プロフィール |

コレクション定義は`src/content.config.ts`に集約する。

ローカルファイルは`glob()`または`file()`ローダーで読み込む。

### 5.2 Blogスキーマ

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `title` | string | ○ | 記事タイトル |
| `description` | string | ○ | 記事概要 |
| `publishedAt` | date | ○ | 公開日 |
| `updatedAt` | date | — | 更新日 |
| `authors` | reference[] | ○ | 著者ID |
| `category` | enum | ○ | 記事カテゴリー |
| `tags` | string[] | — | タグID |
| `cover` | image | — | カバー画像 |
| `coverAlt` | string | 条件付き | 画像の代替テキスト |
| `draft` | boolean | — | 下書き状態 |
| `featured` | boolean | — | 注目記事指定 |

`draft`と`featured`のデフォルトは`false`とする。

カテゴリーは以下の3種類とする。

- `tech`：技術記事
- `activity`：活動報告
- `news`：お知らせ

タグは内部IDと表示名を分離し、`src/data/tags.ts`などの定義ファイルで管理する。

記事のURL識別子はMarkdownファイル名から生成する。ファイル名は英小文字、数字、ハイフンのみで構成し、公開後は原則変更しない。

`cover`がある場合は`coverAlt`も必須とする。

### 5.3 Projectsスキーマ

| フィールド | 型 | 必須 |
|---|---|---|
| `title` | string | ○ |
| `description` | string | ○ |
| `status` | enum | ○ |
| `technologies` | string[] | — |
| `authors` | reference[] | — |
| `cover` | image | — |
| `coverAlt` | string | 条件付き |
| `repositoryUrl` | URL | — |
| `websiteUrl` | URL | — |
| `featured` | boolean | — |
| `draft` | boolean | — |

`status`には`planning`、`active`、`completed`、`archived`を使用する。

### 5.4 Authorsスキーマ

著者データには次の情報を保持する。

- `id`
- `displayName`
- `bio`（任意）
- `github`（任意）
- `website`（任意）
- `avatar`（任意）

個人情報の掲載は本人の同意を前提とする。

本名の公開は必須にせず、ハンドルネームを使用できるようにする。

共通著者IDとして`alg`を用意し、個人名義ではない記事に使用する。

### 5.5 下書きと非公開

`draft: true`の記事は本番サイト・記事一覧・検索インデックス・RSS・サイトマップから除外する。

下書きの本文データも本番の配信成果物に含めない。

ただし、公開GitHubリポジトリに保存した下書きはGitHub上から閲覧可能である。公開前の機密情報はMarkdownの`draft`設定に依存せず、そもそも公開リポジトリへコミットしない運用とする。

公開日が将来の日付の記事を登録しても、日時の到来だけでは再ビルドされない。初期仕様では自動公開予約を実装しない。

---

## 6. ディレクトリ設計

リポジトリ名は`website`を推奨する。

主要ディレクトリを以下のように構成する。

| パス | 内容 |
|---|---|
| `.github/workflows/` | GitHub Actions |
| `.github/CODEOWNERS` | レビュー担当定義 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PRテンプレート |
| `public/` | favicon、robots.txt、固定アセット |
| `src/assets/` | 最適化対象の画像 |
| `src/components/` | 共通UIコンポーネント |
| `src/content/blog/` | 記事Markdown・MDX |
| `src/content/projects/` | プロジェクトMarkdown・MDX |
| `src/data/authors.json` | 著者データ |
| `src/data/tags.ts` | タグ定義 |
| `src/layouts/` | 共通レイアウト |
| `src/pages/` | Astroページ・動的ルート |
| `src/styles/` | CSS・デザイントークン |
| `src/lib/` | 共通ロジック |
| `src/content.config.ts` | Content Collections定義 |
| `astro.config.mjs` | Astro設定 |
| `package.json` | 依存関係・スクリプト |
| `bun.lock` | ロックファイル |
| `README.md` | 開発・運用手順 |
| `CONTRIBUTING.md` | 記事投稿ガイド |

`dist/`、`node_modules/`、`.astro/`はGit管理対象から除外する。

---

## 7. UI・デザイン仕様

### 7.1 デザイン方針

技術系サークルにふさわしい、シンプルでモダンなデザインを採用する。

過剰な装飾やアニメーションは避け、情報の読みやすさを優先する。

デザインの主要方針は以下とする。

- 技術記事を読みやすいタイポグラフィ
- 余白を活かしたレイアウト
- 明確な見出し階層
- アクセントカラーを持つ統一デザイン
- モバイルでも利用しやすいナビゲーション
- ダークモードとライトモード
- 過度なJavaScriptを必要としないUI

具体的なカラーコード、フォント、ロゴの使用規則は、別途デザイントークンとして管理する。

### 7.2 レスポンシブ対応

モバイルファーストで実装する。

スマートフォン、タブレット、デスクトップの画面幅に対応する。

デザイン上のブレークポイントはTailwind CSSの標準値を基本として利用し、必要な箇所のみ調整する。

### 7.3 ダークモード

OS設定に応じた自動切り替えと、ユーザーによる手動切り替えを実装する。

手動選択はブラウザのローカルストレージに保持する。切り替え時の画面のちらつきを防止する。

### 7.4 技術記事の表示

技術記事には以下の表示機能を設ける。

- コードのシンタックスハイライト
- 長いコードブロックの横スクロール
- コードのコピー機能
- 見出しごとのアンカーリンク
- 目次の表示
- テーブルの横スクロール対応
- Markdown画像のレスポンシブ表示
- 外部リンクの適切な属性設定

シンタックスハイライトにはAstro標準の機能を使用し、独自のハイライトライブラリは導入しない。

### 7.5 アクセシビリティ

WCAG 2.2 AAを目標とする。

キーボード操作、フォーカス表示、画像の代替テキスト、適切なコントラスト、セマンティックHTML、見出し階層を重視する。

---

## 8. 検索機能

検索にはPagefindを採用する。

### 8.1 検索対象

初期状態では以下を検索対象とする。

- 公開記事
- プロジェクト詳細ページ

トップページ、プライバシーポリシー、404ページなどは検索対象から除外する。

対象領域には`data-pagefind-body`を設定する。

### 8.2 検索方式

Astroビルド後にPagefindを実行し、生成済みHTMLからインデックスを作成する。

検索処理はブラウザ側で実行し、外部検索APIや専用検索サーバーを利用しない。

HTMLの言語属性を`ja`に設定し、日本語の単語分割に対応したPagefindの拡張版を利用する。

検索関連のJavaScriptやインデックスは必要なときに読み込む。

---

## 9. SEO・外部配信

### 9.1 SEO

すべての公開ページに以下を設定する。

- 一意な`title`
- `meta description`
- Canonical URL
- Open Graphメタデータ
- X向けカードメタデータ
- 言語情報
- サイトアイコン

記事ページにはArticle、サイト全体には適切なOrganization等の構造化データを設定する。

サークルの大学公認状況や大学との関係について、実態と異なる表現をしない。

### 9.2 サイトマップ

`@astrojs/sitemap`を利用する。

公開されている正規URLのみを登録する。

### 9.3 RSS

`@astrojs/rss`を利用する。

`/rss.xml`から公開済みのブログ記事を配信する。

記事タイトル、概要、URL、公開日を含める。更新日も可能な範囲で反映する。

### 9.4 OGP画像

標準のOGP画像を用意する。

記事ごとにカバー画像を設定できるようにし、未設定時には標準画像を使用する。

OGP画像の自動生成は初期実装では必須としない。

---

## 10. 画像・静的アセット

### 10.1 画像管理

記事・プロジェクトの画像は原則としてリポジトリ内で管理する。

Astroの画像処理機能を利用し、適切な表示サイズ、代替テキスト、必要に応じたWebP/AVIF変換に対応する。

画像の遅延読み込みを適用する。ただし、ページ上部の主要画像については表示速度を優先して個別に設定する。

### 10.2 サイズ制限

Cloudflare Workers + Static Assetsの単一ファイルサイズ上限に抵触しない構成とする。

記事画像は可能な限り圧縮し、1ファイルあたり2 MiB以下を推奨する。

動画や大容量アーカイブをGitリポジトリに直接保存しない。

大容量コンテンツが必要になった段階でR2等の利用を個別に検討する。

---

## 11. GitHub運用・CI/CD

### 11.1 リポジトリ

GitHub Organization配下に公式サイト用リポジトリを設置する。

`main`を本番用ブランチとする。

原則として直接Pushを禁止し、Pull Request経由で変更を反映する。

### 11.2 記事投稿ワークフロー

1. 部員が作業ブランチを作成する。
2. MarkdownまたはMDXを追加・編集する。
3. ローカル環境でプレビューする。
4. GitHubへPushする。
5. Pull Requestを作成する。
6. 自動チェックとプレビュー生成を実行する。
7. レビューを受ける。
8. `main`へマージする。
9. Cloudflare Workers + Static Assetsで本番ビルド・公開する。

### 11.3 レビュー

最低1名によるレビューを基本とする。

記事内容の正確性、誤字脱字、掲載許可、情報漏洩、リンク切れ、表示品質を確認する。

コードや依存関係を変更するPRについては、Webサイト管理担当者のレビューを必要とする。

CODEOWNERSとGitHubの保護ルールを組み合わせて運用する。

### 11.4 GitHub Actions

Pull Requestに対して以下を実行する。

- Bunによる依存関係の固定インストール
- Biomeによるコード・整形検査（MDXのみPrettierで整形検査）
- BiomeによるMarkdown検査と、markdownlint-cli2によるMDX検査
- `astro check`による型検査
- Astroの本番ビルド
- ビルドエラーとメタデータ検証エラーの検出

すべての必須チェックが成功した場合にのみマージ可能とする。

### 11.5 Cloudflare Workers + Static Assets

Workers BuildsによるGitHub連携方式を採用する。配信設定は`wrangler.jsonc`で管理し、Workerスクリプトは追加しない。

| 設定 | 値 |
|---|---|
| プロジェクト名 | `alg-website` |
| 本番ブランチ | `main` |
| Build command | `bun ci && bun run build:cloudflare` |
| Deploy command | `bunx wrangler deploy` |
| Preview command | `bunx wrangler preview` |
| assets.directory | `./dist` |
| Root directory | `/` |
| 自動本番デプロイ | 有効 |
| プレビューデプロイ | 有効 |
| カスタムドメイン | `alg-sit.club` |

Bunのバージョンは導入時に検証した安定版を固定する。Cloudflareの自動依存関係インストールは無効化し、ビルドコマンドで明示的に`bun ci`を実行する。

Pagefindのインデックス生成は`bun run build`の処理に含める。Workers Buildsでは`build:cloudflare`から呼び出す。`WORKERS_CI_BRANCH`を必須とし、main以外は検索を拒否して`SITE_RELEASE`を無効化する。HTMLの末尾スラッシュを強制し、未検出URLはカスタム404を返す。

### 11.6 デプロイ失敗時

CIまたはビルド失敗時は公開を行わない。

本番デプロイ失敗時には直前の正常な公開バージョンを維持する。

問題があるデプロイを公開した場合は、Cloudflare Workers + Static Assetsのロールバック機能またはGitのRevertで復旧できる運用とする。

---

## 12. 開発環境・品質管理

### 12.1 開発環境

Windows、Linux、macOSを対象とする。

Bunは共通のパッケージマネージャーとして利用する。

主なスクリプトを以下のように定義する。

| コマンド | 動作 |
|---|---|
| `bun install` | 依存関係の導入 |
| `bun ci` | ロックファイルに基づく固定インストール |
| `bun run dev` | ローカル開発サーバー |
| `bun run build` | 静的ビルド＋検索インデックス生成 |
| `bun run preview` | 生成サイトの確認 |
| `bun run check` | Astro型検査 |
| `bun run lint` | コード・Markdown検査 |
| `bun run format` | コード整形 |
| `bun run format:check` | 整形状態の確認 |

### 12.2 パフォーマンス

Core Web VitalsのGood基準を満たすことを目標とする。

| 指標 | 目標 |
|---|---|
| LCP | 2.5秒以下 |
| INP | 200ms以下 |
| CLS | 0.1以下 |
| Lighthouse Performance | 90以上 |
| Lighthouse Accessibility | 90以上 |
| Lighthouse Best Practices | 90以上 |
| Lighthouse SEO | 90以上 |

Lighthouseは代表ページのモバイル環境を中心に測定する。実ユーザー指標とテスト指標は区別して評価する。

### 12.3 セキュリティ

- CloudflareアカウントとGitHubには多要素認証を使用する。
- 秘密鍵・認証トークン・パスワードをリポジトリに保存しない。
- 外部依存ライブラリは定期的に更新する。
- Dependabot等による依存関係の更新通知を有効にする。
- GitHub Actionsには必要最小限の権限を付与する。
- MDXやHTMLに含まれるコードを信頼できる状態でのみビルドする。
- 外部サイトからコピーした埋め込みスクリプトは無条件に許可しない。
- セキュリティヘッダーはCloudflare Workers + Static Assetsの`_headers`等で設定する。

### 12.4 プライバシー

初期バージョンでは独自のアクセス解析システムを設置しない。

部員のプロフィールや活動写真を掲載する際は、本人または関係者の掲載許可を確認する。

将来的にアクセス解析や問い合わせフォームを追加する場合は、プライバシーポリシーを更新する。

---

## 13. 運用体制

### 13.1 権限

| 役割 | 権限 |
|---|---|
| サークル代表・管理責任者 | GitHub・Cloudflareの組織管理 |
| Webサイト管理担当 | ソースコード変更、レビュー、公開管理 |
| 記事編集担当 | 記事の内容確認、レビュー |
| 一般部員 | ブランチ作成、記事執筆、PR作成 |
| 外部貢献者 | 許可された方法によるPR提出 |

Cloudflareの管理権限は記事執筆者全員には付与しない。

### 13.2 運用ドキュメント

以下の文書をリポジトリ内に配置する。

- `README.md`：開発環境構築、ローカル起動、全体構成
- `CONTRIBUTING.md`：記事執筆・Pull Requestの手順
- `docs/CONTENT_GUIDE.md`：Markdownの書式とFrontmatter
- `docs/DEPLOYMENT.md`：Cloudflare Workers + Static Assetsの設定・デプロイ手順
- `docs/OPERATIONS.md`：権限管理・障害対応・引き継ぎ
- `.github/PULL_REQUEST_TEMPLATE.md`：PR確認項目

### 13.3 維持管理

- 依存関係と脆弱性を定期的に確認する。
- 年度交代時に管理権限を確認する。
- アカウント管理責任者を複数名確保する。
- Cloudflare Workers + Static Assetsの構成を文書化する。
- GitHubのリポジトリとCloudflareの設定をサークル資産として引き継ぐ。

---

## 14. 将来の拡張方針

以下は初期実装の対象外とする。

| 機能 | 想定される実装 |
|---|---|
| ブラウザからの記事投稿 | GitベースCMSまたはEmDash等 |
| コメント | 外部コメントシステム等 |
| 問い合わせフォーム | Cloudflare Workers |
| 記事公開予約 | 定期ビルドまたはCMS |
| アクセス解析 | Cloudflare Web Analytics |
| 多言語化 | Astro i18n routing |
| 大容量ファイル | Cloudflare R2 |
| インタラクティブデモ | Astro Islands |
| 部員専用ページ | Cloudflare Access等 |

将来の拡張時も、可能な限り静的サイトとしての構造を維持する。

---

## 15. 受け入れ条件

初期バージョンの完成条件を以下とする。

- [ ] `https://alg-sit.club/`で公式サイトを閲覧できる。
- [ ] スマートフォン・PCの両方で主要ページを正常に表示できる。
- [ ] MarkdownおよびMDXから記事が生成される。
- [ ] Frontmatterの不正な値をビルド時に検出できる。
- [ ] 下書き記事が本番配信成果物に含まれない。
- [ ] ブログ記事とプロジェクトを一覧表示できる。
- [ ] 記事の著者・公開日・タグを表示できる。
- [ ] 日本語の記事検索が機能する。
- [ ] RSSとサイトマップが生成される。
- [ ] Canonical URLとOGP情報が設定される。
- [ ] PR作成時にCIが実行される。
- [ ] PR用のCloudflare Workers + Static Assetsプレビューを閲覧できる。
- [ ] `main`へのマージによって自動公開される。
- [ ] ビルド失敗時に不完全なサイトが公開されない。
- [ ] 管理権限と記事投稿手順が文書化されている。
- [ ] 無料プランのCloudflare Workers + Static Assetsで運用できる。

---

## 16. 確定事項

本仕様書では、以下を初期アーキテクチャとして確定する。

**Framework:** Astro 7系
**Language:** TypeScript
**Content:** Astro Content Collections
**Markdown:** Sätteri + MDX
**Styling:** Tailwind CSS v4
**Search:** Pagefind
**Package Manager:** Bun
**Repository:** GitHub Organization
**CI:** GitHub Actions
**CD / Hosting:** Cloudflare Workers + Static Assets
**Database:** なし
**CMS:** なし
**Primary Domain:** alg-sit.club

ロゴ、アクセントカラー、実際の紹介文章、公開する活動情報、問い合わせ先などは、コンテンツ・デザイン制作時に確定する。

本仕様書の技術構成を実装の基準とし、変更が必要な場合は仕様書のバージョンを更新して記録する。

## 17. 改訂履歴

- 1.0.1：Linter・Formatterの標準をBiomeへ変更。Astroの全体処理を有効化し、Biome未対応のMDXに限りPrettierとmarkdownlint-cli2を使用する。
