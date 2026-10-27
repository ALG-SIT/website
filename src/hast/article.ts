import { defineHastPlugin } from 'satteri';

const languageLabels: Record<string, string> = {
  python: 'Python',
  py: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  yaml: 'YAML',
  yml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  text: 'Text',
  txt: 'Text',
  plaintext: 'Text',
};

export const articleEnhancements = defineHastPlugin({
  name: 'alg-article-enhancements',
  element: [
    {
      filter: ['input'],
      visit(node, context) {
        if (node.properties.type !== 'checkbox') return;
        const parent = context.parent(node);
        context.setProperty(
          node,
          'ariaLabel',
          parent ? context.textContent(parent).trim() : 'チェック項目',
        );
      },
    },
    {
      filter: ['h2', 'h3', 'h4', 'h5', 'h6'],
      visit(node, context) {
        if (typeof node.properties.id !== 'string') return;
        context.appendChild(node, {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${node.properties.id}`,
            className: ['heading-anchor'],
            ariaLabel: `${context.textContent(node)}へのリンク`,
            'data-pagefind-ignore': true,
          },
          children: [],
        });
      },
    },
    {
      filter: ['a'],
      visit(node, context) {
        const href = node.properties.href;
        if (typeof href !== 'string' || !/^https?:\/\//.test(href)) return;
        if (new URL(href).origin !== 'https://alg-sit.club')
          context.setProperty(node, 'rel', [
            'external',
            'noopener',
            'noreferrer',
          ]);
      },
    },
    {
      filter: ['table'],
      visit(node, context) {
        context.wrapNode(node, {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['table-wrapper'],
            tabIndex: 0,
            role: 'region',
            ariaLabel: '表（横スクロール可能）',
          },
          children: [],
        });
      },
    },
    {
      filter: ['pre'],
      visit(node, context) {
        const code = node.children.find(
          (child) => child.type === 'element' && child.tagName === 'code',
        );
        const languageClass =
          code?.type === 'element' && Array.isArray(code.properties.className)
            ? code.properties.className.find(
                (name) =>
                  typeof name === 'string' && name.startsWith('language-'),
              )
            : undefined;
        const language = String(
          node.properties.dataLanguage ??
            node.properties['data-language'] ??
            (typeof languageClass === 'string'
              ? languageClass.slice(9)
              : 'text'),
        );
        context.replaceNode(node, {
          type: 'element',
          tagName: 'div',
          properties: { className: ['code-wrapper'] },
          children: [
            {
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['code-header'],
                'data-pagefind-ignore': true,
              },
              children: [
                {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: ['code-language'] },
                  children: [
                    {
                      type: 'text',
                      value: languageLabels[language] ?? language,
                    },
                  ],
                },
              ],
            },
            {
              ...node,
              properties: { ...node.properties, tabIndex: 0 },
            },
          ],
        });
      },
    },
  ],
});
