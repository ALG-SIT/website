import { defineHastPlugin } from 'satteri';

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
        context.setProperty(node, 'tabIndex', 0);
      },
    },
  ],
});
