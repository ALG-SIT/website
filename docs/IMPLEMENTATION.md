# 実装上の決定

仕様書v1.0.1を基準とし、未確定だった表示・公開ポリシーを次のように具体化しています。

- 品質管理：Biome 2.6.3をLinter・Formatterとして使用。Astroの全文処理は実験的機能を明示的に有効化。MDXのみPrettier・markdownlint-cli2で補完し、Astro用Prettierプラグインは使用しない。
- CSSルール：共通CSSの`noDescendingSpecificity`は独立したコンポーネント間の誤検出を避けるため無効。`noImportantStyles`もShikiのインライン配色の上書き、hidden属性、動きを抑える設定を維持するため同ファイルだけ無効。ほかの推奨ルールは有効。
- フォント：Noto Sans JPを同一オリジンで配信。公開HTMLとUIで使用する文字だけをビルド時に抽出し、400・700の2ファイルに縮小。外部フォントサービスへの通信は行わない。ライセンスは`public/fonts/OFL.txt`。
- デザイン：ライトは白基調、ダークは暗いニュートラル。ピンクを主ボタン・強調に、グリーンを補助リンク・アイコンに使用。ブランド色はピンク`#D4537E`とグリーン`#19ADA5`、文字にはコントラストを確保した濃淡を使用。
- テーマ：「システム」「ライト」「ダーク」をヘッダーの標準selectで選択。初期値はOS追従。`alg-theme`に`system`・`light`・`dark`を保存し、既存の手動選択も引き継ぐ。保存不可時はページ内で選択を維持。JavaScript無効時はCSSでOS追従。
- ロゴ：追加されたSVG・JPGの原本は公開対象外の`design/brand/originals/`に保持（`wordmark.svg`・`square-logo.jpg`）。横長SVGは余白・説明を整理し下線をグリーンに変更。正方形は原本JPGの輪郭をパス化した背景透明SVG。画面では`BrandWordmark`・`BrandSquare`をインラインSVGとして表示し、文字は`currentColor`、説明文は`--muted`でテーマに追従。ハートと下線は固有色を維持し、白い背景・外枠・影を付けない。配布用の`public/brand-wordmark.svg`・`public/brand-square.svg`はOS設定に追従する。原本SVGは書き出し時のスタイルを保つためBiomeの対象外。構造化データは正方形SVGを参照。faviconは透明背景のハート、OGPは白背景の1200×630px。OGPの編集元は`src/assets/og-source.svg`で、PNGはSharpで書き出す。
- トップ：最新記事3件、featuredプロジェクト最大3件。
- ブログ：公開日降順。同日の場合はslug順。カテゴリー切り替えは一覧内で実施。
- 関連記事：共通タグ数の多い順、同数は公開日降順。本人を除き最大3件。
- 検索：ヘッダーから開くダイアログ。公開記事・プロジェクト本文を対象とし、検索モジュールを遅延取得。先頭20件を表示。
- 検索対象0件：Pagefindによる固定ページへのフォールバックを避け、空結果を返す軽量モジュールを生成。
- タグページ：公開記事が存在するタグにだけ生成。
- 公開判定：`draft: false`かつ記事公開日がビルド時点以前。将来日の到来だけでは公開されない。
- PRプレビュー：本番と同じ公開判定。下書きはローカル開発だけで確認。
- 下書き素材：`public/`には置かず、公開ページから参照しない。
- 初期素材：開発サンプルを含むため`preview: true`。正式公開ゲートを用意。
- Markdown拡張：SätteriネイティブのHASTプラグインで見出しアンカー・外部リンク属性・横スクロール表を静的生成。remark/rehypeは不使用。
- セキュリティ：Cloudflareの`_headers`を使用。テーマ初期化・構造化データのためのinline scriptとPagefindのWebAssemblyを許可。外部リソースは既定で許可しない。
- TypeScript：最新7系は`astro check`未対応のため、互換性のある6.0.3をロック。

## 外部設定が必要な項目

GitHub remote・CODEOWNERSの実在チーム・ブランチ保護・Cloudflare Pages・DNSはリポジトリだけでは確定できません。[デプロイ手順](DEPLOYMENT.md)に従って管理担当者が設定します。
