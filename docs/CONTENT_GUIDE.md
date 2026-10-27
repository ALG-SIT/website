# コンテンツガイド

## 記事

`src/content/blog/my-first-experiment.md`のように、直下へファイルを配置します。ファイル名は英小文字・数字・ハイフンのみを使い、単語の区切りにハイフンを1個使用します。`.md`と`.mdx`で同じ名前は使えません。

````markdown
---

title: 実験のタイトル
description: 記事の概要を短く記載します。
publishedAt: 2026-10-25
authors: [alg]
category: tech
tags: [ai, gpu]
draft: true
featured: false
---

## はじめに

本文を書きます。

```python
print('Hello, ALG!')
```
````

公開日を日付だけで指定した場合はその日のUTC午前0時として扱います。時刻を明示するなら`2026-10-25T09:00:00+09:00`のように記入してください。表示は日本時間です。

`category`は`tech`（技術記事）、`activity`（活動報告）、`news`（お知らせ）のいずれかです。任意の`updatedAt`は公開日以降にします。`draft`と`featured`の既定値は`false`です。

`authors`は1名以上を指定し、`src/data/authors.json`のIDを参照します。個人名義でない記事は`alg`を使用できます。`tags`は`src/data/tags.ts`のIDを使用します。

## 公開範囲

- `dev`：下書きと将来日付の記事も表示します。
- 本番ビルド・PRプレビュー：下書きを除外し、公開日がビルド時点より先の記事も除外します。
- 除外した記事のURL・本文は一覧、関連記事、RSS、サイトマップ、検索、配信成果物へ含めません。
- 日時到来による自動再ビルドはありません。将来記事の公開には、日時到来後にマージまたは再デプロイしてください。

公開する画像を`public/`へ置くと記事の公開状態にかかわらず配信されます。下書き用画像は`src/assets/`などに置き、公開記事から参照しないでください。

## 画像

画像は原則リポジトリ内に置き、1枚2 MiB以下を目安に圧縮してください。動画やアーカイブはコミットしません。

```yaml
cover: ../../assets/my-experiment.webp
coverAlt: 実験結果を比較したグラフ
```

`cover`がある場合は`coverAlt`が必須です。本文画像は`![内容を説明する代替テキスト](../../assets/image.webp)`のように指定します。Astroのローカル画像処理を使用します。

## Markdown・MDX

コードフェンスには `python`・`js`・`ts` などの言語名を指定してください。
コード欄の左上に「Python」「JavaScript」「TypeScript」などの言語名が表示されます。
指定なし・プレーンテキストは「Text」、表示名の定義がない言語は言語名をそのまま表示します。
JavaScript有効時は右上のボタンでコード本文をコピーできます。

見出しは`##`から始めます。ページの`h1`は記事タイトルから生成されます。見出しのIDと目次は自動生成されます。リスト、引用、表、チェックリスト、脚注、言語付きコードブロックを使用できます。

MDXではレビュー済みのAstroコンポーネントを使用できます。

```mdx
import Callout from '../../components/Callout.astro';

<Callout title="補足">
  <p>記事に補足したい内容。</p>
</Callout>
```

## プロジェクト

`src/content/projects/`へMarkdownまたはMDXを配置します。

```yaml
---
title: プロジェクト名
description: 取り組みの概要
status: planning
technologies: [Python, GPU]
authors: [alg]
featured: true
draft: true
---
```

状態は`planning`・`active`・`completed`・`archived`です。任意で`repositoryUrl`、`websiteUrl`、`cover`、`coverAlt`を設定します。外部URLはHTTP(S)に限定します。著者・画像・下書きの扱いは記事と共通です。

## 著者

`src/data/authors.json`に`id`、`displayName`を登録します。`bio`、`github`、`website`、`avatar`は任意です。アバターは著者JSONからの相対パスを使用します。ハンドルネームを利用でき、本名は不要です。掲載前に本人の同意を確認してください。

タグや著者を削除するときは参照している全コンテンツも更新してください。不正な値・参照先・slug・カバーの代替テキスト欠落はビルドを失敗させます。
