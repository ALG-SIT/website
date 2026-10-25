export {};
const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle');
function updateThemeLabel() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton?.setAttribute(
    'aria-label',
    dark ? 'ライトモードに切り替え' : 'ダークモードに切り替え',
  );
}
updateThemeLabel();
themeButton?.addEventListener('click', () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('alg-theme', document.documentElement.dataset.theme);
  } catch {
    /* 保存できない環境でも切り替え可能 */
  }
  updateThemeLabel();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener(
  'change',
  (event) => {
    try {
      if (['dark', 'light'].includes(localStorage.getItem('alg-theme') ?? ''))
        return;
    } catch {
      /* OS設定に追従 */
    }
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
    updateThemeLabel();
  },
);
const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(expanded));
  menuButton.setAttribute(
    'aria-label',
    expanded ? 'メニューを閉じる' : 'メニューを開く',
  );
  document.querySelector('#mobile-nav')?.classList.toggle('is-open', expanded);
});
document.addEventListener('keydown', (event) => {
  if (
    event.key === 'Escape' &&
    menuButton?.getAttribute('aria-expanded') === 'true'
  ) {
    menuButton.click();
    menuButton.focus();
  }
});
document
  .querySelectorAll<HTMLButtonElement>('[data-filter]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      document
        .querySelectorAll('[data-filter]')
        .forEach((item) =>
          item.setAttribute('aria-pressed', String(item === button)),
        );
      let count = 0;
      document
        .querySelectorAll<HTMLElement>('[data-category]')
        .forEach((card) => {
          card.hidden =
            button.dataset.filter !== 'all' &&
            card.dataset.category !== button.dataset.filter;
          if (!card.hidden) count++;
        });
      const countLabel = document.querySelector('#filter-count');
      if (countLabel) countLabel.textContent = `${count}件の記事`;
    });
  });
for (const pre of document.querySelectorAll('pre')) {
  pre.setAttribute('tabindex', '0');
  const button = document.createElement('button');
  button.className = 'copy-button';
  button.textContent = 'コピー';
  button.setAttribute('aria-label', 'コードをコピー');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(
        pre.querySelector('code')?.textContent ?? '',
      );
      button.textContent = 'コピーしました';
    } catch {
      button.textContent = 'コピーできませんでした';
    }
    setTimeout(() => {
      button.textContent = 'コピー';
    }, 2000);
  });
  const wrapper = document.createElement('div');
  wrapper.className = 'code-wrapper';
  pre.before(wrapper);
  wrapper.append(pre, button);
}
for (const table of document.querySelectorAll('.prose table')) {
  if (table.parentElement?.classList.contains('table-wrapper')) continue;
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';
  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', '表（横スクロール可能）');
  table.before(wrapper);
  wrapper.append(table);
}
interface SearchResult {
  data: () => Promise<{
    url: string;
    meta: { title?: string };
    excerpt: string;
  }>;
}
interface SearchAPI {
  search: (query: string) => Promise<{ results: SearchResult[] }>;
}
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-input');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
let pagefind: Promise<SearchAPI> | undefined;
let searchSequence = 0;
let timer: ReturnType<typeof setTimeout>;
function loadSearch() {
  const searchModulePath: string = '/pagefind/pagefind.js';
  return (pagefind ??= (
    import(/* @vite-ignore */ searchModulePath) as Promise<SearchAPI>
  ).catch((error: unknown) => {
    pagefind = undefined;
    throw error;
  }));
}
for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-search-open]',
)) {
  button.addEventListener('click', () => {
    dialog?.showModal();
    input?.focus();
    void loadSearch().catch(() => {
      if (status)
        status.textContent =
          '検索を読み込めませんでした。ビルド後のプレビューで再度お試しください。';
    });
  });
}
document
  .querySelector('[data-search-close]')
  ?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  }
});
dialog?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.close();
  }
});
input?.addEventListener('input', () => {
  clearTimeout(timer);
  const sequence = ++searchSequence;
  const query = input.value.trim();
  results?.replaceChildren();
  if (!query) {
    if (status) status.textContent = 'キーワードを入力してください。';
    return;
  }
  if (status) status.textContent = '検索しています…';
  timer = setTimeout(async () => {
    try {
      const api = await loadSearch();
      const found = await api.search(query);
      const entries = await Promise.all(
        found.results.slice(0, 20).map((result) => result.data()),
      );
      if (sequence !== searchSequence) return;
      if (status)
        status.textContent = found.results.length
          ? `${found.results.length}件見つかりました${found.results.length > 20 ? '（先頭20件を表示）' : ''}`
          : '該当する記事は見つかりませんでした。別のキーワードをお試しください。';
      results?.replaceChildren();
      for (const entry of entries) {
        const url = new URL(entry.url, location.origin);
        if (url.origin !== location.origin) continue;
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = url.pathname + url.hash;
        link.textContent = entry.meta.title ?? '検索結果';
        const snippet = document.createElement('p');
        const parsed = new DOMParser().parseFromString(
          entry.excerpt,
          'text/html',
        );
        snippet.textContent = parsed.body.textContent ?? '';
        item.append(link, snippet);
        results?.append(item);
      }
    } catch {
      if (sequence === searchSequence && status)
        status.textContent =
          '検索を読み込めませんでした。時間をおいて入力し直してください。';
    }
  }, 180);
});
