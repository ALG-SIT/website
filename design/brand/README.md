# ブランド素材

## 原本（公開対象外）

提供された素材を内容を変えずに`originals/`へ保管しています。サイトから参照せず、ビルド成果物へコピーしません。

| 保管先                      | 提供時のファイル名                   | 内容                   |
| --------------------------- | ------------------------------------ | ---------------------- |
| `originals/wordmark.svg`    | `ai_love_gpu_logo_wordmark_type.svg` | 横長ワードマークの原本 |
| `originals/square-logo.jpg` | `c2a3b3c201823278.jpg`               | 正方形ロゴの原本       |

原本SVGの書き出し時のスタイルを保つため、このファイルのみBiomeの対象外としています。

## 使用する素材

- `src/components/BrandWordmark.astro`・`BrandSquare.astro`：サイト表示用の透明なインラインSVG。文字色はサイトのテーマに追従します。
- `public/brand-wordmark.svg`・`brand-square.svg`：単独配布用の透明SVG。OSのテーマに追従します。正方形SVGは構造化データからも参照します。
- `public/favicon.svg`：ブラウザタブ用のハートアイコン。
- `src/assets/og-source.svg`：OGPの編集元。書き出したPNGは`public/og.png`に配置します。

`public/`には公開・配信するファイルだけを置きます。詳しい配色・テーマ仕様は[実装上の決定](../../docs/IMPLEMENTATION.md)を参照してください。
