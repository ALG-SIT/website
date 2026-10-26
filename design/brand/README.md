# ブランド素材

## 原本（公開対象外）

提供された素材を内容を変えずに`originals/`へ保管しています。サイトから参照せず、ビルド成果物へ原本名でコピーしません。表示に採用する素材だけを`public/`へ用途別の名前で複製します。

| 保管先                      | 提供時のファイル名                   | 内容                   |
| --------------------------- | ------------------------------------ | ---------------------- |
| `originals/wordmark.svg`    | `ai_love_gpu_logo_wordmark_type.svg` | 横長ワードマークの原本 |
| `originals/square-logo.jpg` | `c2a3b3c201823278.jpg`               | 正方形ロゴの原本       |

追加の横長ワードマーク素材：

- `originals/412f4846578586c9.png`：黒文字・透過背景。ライトテーマ用。
- `originals/0de622ab9b2d421a.png`：白文字・透過背景。ダークテーマ用。
- `originals/bc288ac999f8a178.jpg`：白背景の参考原本。

原本SVGの書き出し時のスタイルを保つため、このファイルのみBiomeの対象外としています。

## 使用する素材

- `src/components/BrandWordmark.astro`：提供された透過PNGをそのまま表示。`public/brand-wordmark-light.png`・`brand-wordmark-dark.png`をテーマに応じて切り替えます。画像の再描画・再圧縮・色変更はせず、外周余白だけをCSSで調整します。
- `src/components/BrandSquare.astro`：正方形ロゴの透明なインラインSVG。文字色はサイトのテーマに追従します。
- `public/brand-square.svg`：正方形ロゴの単独配布用の透明SVG。OSのテーマに追従し、構造化データからも参照します。
- `public/favicon.svg`：ブラウザタブ用のハートアイコン。favicon派生画像の原本。
- `public/favicon-96x96.png`・`public/favicon.ico`：透過背景の互換アイコン。ICOは16・32・48pxのPNGを格納。
- `public/apple-touch-icon.png`：白背景、180×180pxのホーム画面用アイコン。
- `src/assets/og-source.svg`：OGPの編集元。書き出したPNGは`public/og.png`に配置します。

`public/`には公開・配信するファイルだけを置きます。詳しい配色・テーマ仕様は[実装上の決定](../../docs/IMPLEMENTATION.md)を参照してください。

## faviconの再生成

`bun run icons:build`で、`public/favicon.svg`からPNG・ICO・Apple Touch Iconを生成します。Sharpのバージョンは開発依存に固定し、生成済み画像をコミットします。通常ビルドでの再生成は不要です。ハートの形状・色を維持し、Apple Touch Iconのみ白背景にします。

カバー画像のある記事・プロジェクトの共有画像は、ビルド時に最大幅1200pxのPNGへ変換します。カバーがない場合は既存の`public/og.png`を使用します。画像の幅・高さ・MIME型・代替テキストをOGPに、代替テキストをXカードにも出力します。
