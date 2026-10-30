# 実装上の決定

仕様書v1.0.1を基準とし、未確定だった表示・公開ポリシーを次のように具体化しています。

- 品質管理：Biome 2.6.3をLinter・Formatterとして使用。Astroの全文処理は実験的機能を明示的に有効化。MDXのみPrettier・markdownlint-cli2で補完し、Astro用Prettierプラグインは使用しない。
- CSSルール：共通CSSの`noDescendingSpecificity`は独立したコンポーネント間の誤検出を避けるため無効。`noImportantStyles`もShikiのインライン配色の上書き、hidden属性、動きを抑える設定を維持するため同ファイルだけ無効。ほかの推奨ルールは有効。
- CSS配置：全体のトークン・リセットは`src/styles/global.css`、Markdown/MDX本文は`src/styles/content.css`、再利用コンポーネントやページ固有の複雑な見た目は各`.astro`のスコープ付き`<style>`に置く。Tailwind CSS v4は短い単純なユーティリティに使い、長い任意値・状態・レスポンシブ指定の塊や重複表現は意味のあるクラスまたはコンポーネントへ移す。vanilla-extractはAstroスコープCSSとの比較で転送量の有意な改善がなかったため採用しない。
- CSS配信：Astroの`inlineStylesheets: 'auto'`を使う。最終ソースで`always`と比較した5回中央値は、LCP差がトップ-1ms、記事+3ms、プロジェクト+76msで、いずれも許容幅（100msまたは5%の大きい方）内だった。`always`は初回のHTML+CSS gzipが51〜372B小さい一方、`auto`は共通CSSをキャッシュした再訪でページあたり約6.2〜6.5KB小さくなるため`auto`を採用する。基準版との比較では初回転送量がページにより増減するが、3ページ閲覧の合計は約10.7KB減った。数値は[検証記録](VALIDATION.md#css配置変更と配信比較（2026年10月30日）)を参照する。生成物検証はインラインスタイルと同一オリジンの生成CSSリンクの両方を許容し、リンク先の存在を確認する。
- フォント：Noto Sans JPを同一オリジンで配信。公開HTMLとUIで使用する文字だけをビルド時に抽出し、400・700の2ファイルに縮小。Astro Fonts APIのローカルプロバイダーで内容のハッシュ付きURLを生成し、長期キャッシュ。外部フォントサービスへの通信は行わない。ライセンスは`public/fonts/OFL.txt`。
- デザイン：ライトは白基調、ダークは暗いニュートラル。ピンクを主ボタン・強調に、グリーンを補助リンク・アイコンに使用。ブランド色はピンク`#D4537E`とグリーン`#19ADA5`、文字にはコントラストを確保した濃淡を使用。
- テーマ：ヘッダーの太陽（ライト）・月（ダーク）・モニター（OS設定に従う）のアイコンボタンで選択。選択状態は背景・枠線とaria-pressedで示す。初期値はOS追従。`alg-theme`に`system`・`light`・`dark`を保存し、既存の手動選択も引き継ぐ。保存不可時はページ内で選択を維持。JavaScript無効時はCSSでOS追従。
- ロゴ：提供された原本は公開対象外の`design/brand/originals/`に保持。横長ワードマークは指定フォントを維持するため、黒文字PNG（`412f4846578586c9.png`）と白文字PNG（`0de622ab9b2d421a.png`）を加工せず`public/brand-wordmark-light.png`・`brand-wordmark-dark.png`へ複製。`BrandWordmark`では原本から画面幅に応じたWebP派生画像を生成してテーマ別に表示し、外周余白は従来の比率でCSS調整。JavaScript無効時もOSに追従。旧公開ワードマークSVGは廃止。正方形は原本JPGの輪郭をパス化した透明SVGで、`BrandSquare`内の文字は`currentColor`、説明文は`--muted`でテーマに追従。ハートと下線は固有色を維持し、ロゴに白い背景・外枠・影を付けない。配布用の`public/brand-square.svg`はOS設定に追従し、構造化データからも参照。原本SVGは書き出し時のスタイルを保つためBiomeの対象外。faviconは透明背景のハート、OGPは白背景の1200×630px。OGPの編集元は`src/assets/og-source.svg`で、PNGはSharpで書き出す。
- トップ：最新記事3件、featuredプロジェクト最大3件。
- ブログ：公開日降順。同日の場合はslug順。カテゴリー切り替えは一覧内で実施。
- 関連記事：共通タグ数の多い順、同数は公開日降順。本人を除き最大3件。
- 検索：ヘッダーから開くダイアログ。公開記事・プロジェクト本文を対象とし、検索モジュールを遅延取得。先頭20件を表示。
- 検索対象0件：Pagefindによる固定ページへのフォールバックを避け、空結果を返す軽量モジュールを生成。
- タグページ：公開記事が存在するタグにだけ生成。
- 公開判定：`draft: false`かつ記事公開日がビルド時点以前。将来日の到来だけでは公開されない。
- PRプレビュー：本番と同じ公開判定。下書きはローカル開発だけで確認。
- 下書き素材：`public/`には置かず、公開ページから参照しない。
- 公開設定：本番は`preview: false`で検索許可。開発サンプルは下書きにし、機能ブランチは検索拒否。正式公開ゲートを用意。
- コード欄：Markdown・MDXのコードフェンスから言語名付きヘッダーを静的生成。JavaScript有効時はヘッダー右側にコピー操作を追加し、コード本文だけをコピーする。長いコードは本文内で横スクロール。
- Markdown拡張：SätteriネイティブのHASTプラグインで見出しアンカー・外部リンク属性・横スクロール表を静的生成。remark/rehypeは不使用。
- セキュリティ：Cloudflareの`_headers`を使用。テーマ初期化・構造化データのためのinline scriptとPagefindのWebAssemblyを許可。外部リソースは既定で許可しない。
- TypeScript：最新7系は`astro check`未対応のため、互換性のある6.0.3をロック。
- ホスティング：Workers Static Assetsで`dist/`を配信。Workers BuildsのGit連携を使用し、Wranglerを固定依存に追加。Workerコードは持たない。E2EはWranglerのローカル配信で実行する。
- Workersビルド：`build:cloudflare`でブランチを必須にし、main以外は`SITE_RELEASE=0`で生成する。

## 外部設定が必要な項目

GitHub remoteは`ALG-SIT/website`で、サイトは`https://alg-sit.club/`に公開済みです。CODEOWNERSの実在チームは未設定です。ブランチ保護・Cloudflare Workers Builds・DNSの管理画面上の設定はリポジトリだけでは確定できません。[デプロイ手順](DEPLOYMENT.md)に従って管理担当者が設定します。

## SEOと検索公開

- 正規ドメインの定義元は`src/data/site.ts`。Astroのsite設定・canonical・OGP・RSS・robots・構造化データから共有する。
- 検索公開の判定は`src/lib/seo.ts`の`isPreview`に集約する。`site.preview`がtrue、または`WORKERS_CI_BRANCH`がmain以外なら、HTMLはnoindex・nofollow、robotsは全拒否。404は常にnoindex。正式公開の解禁はコンテンツ確認後に行う。
- 構造化データは配列で出力する。Organizationの固定IDを記事のpublisherから参照し、WebSiteはトップページだけに出力。記事とプロジェクト詳細のパンくずは画面表示とBreadcrumbListで同じデータを使う。確認済みSNSはGitHub設定の有無にかかわらずsameAsに含める。
- カバー画像はPNGへ変換して共有する。カバーなしのSNS共有には標準OGP画像を使い、Article.imageは実際のカバーがある場合だけ出力する。公開日・更新日は本文、Article、OGPで一致させる。
- SVGカバーも共有用PNGへ変換するため、Astroの`image.dangerouslyProcessSVG`を有効化する。カバーはコンテンツスキーマで読み込むリポジトリ内のレビュー済み素材に限定し、外部からSVGを受け取るAPIは設けない。
- favicon派生画像の生成方法は[ブランド素材](../design/brand/README.md)を参照。画像実寸・参照先・canonical・検索公開設定・構造化データの主要項目はビルド後の生成物検査で確認する。
