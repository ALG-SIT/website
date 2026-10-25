---
title: 'ALG Official Website'
description: '活動も、コードも、学びも。サークルの知識をつないでいく、静的なWebサイト。'
status: active
technologies: [Astro, TypeScript, Tailwind CSS]
authors: [alg]
featured: true
---

> このページは開発中のサイト紹介サンプルです。正式公開前に内容を確認します。

## 何をつくる？

ALGの紹介、技術記事、活動報告、プロジェクトの成果を公開するWebサイトです。サーバーやデータベースを用意せず、静的なHTMLとして配信します。

## コンテンツを育てる仕組み

MarkdownとMDXで書いた記事を、GitHubのPull Requestで確認して公開します。著者やタグの指定はビルド時に検証し、担当者が変わっても記事を追加しやすい構成にします。

## 技術構成

- Astroによる静的生成
- TypeScriptによる型検査
- Pagefindによるブラウザ内検索
- GitHub ActionsとCloudflare Pagesによる継続的な公開
