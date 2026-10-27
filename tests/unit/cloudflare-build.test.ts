import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve('scripts/build-cloudflare.ts');

test('Workersビルドはブランチを必須にし、公開検証と終了コードを引き継ぐ', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'alg-workers-build-'));
  try {
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ scripts: { build: 'bun fixture.ts' } }),
    );
    await writeFile(
      join(directory, 'fixture.ts'),
      `console.log(JSON.stringify({ branch: process.env.WORKERS_CI_BRANCH, release: process.env.SITE_RELEASE }));
process.exit(Number(process.env.FIXTURE_EXIT ?? 0));`,
    );
    async function run(branch: string | undefined, release = '1', exit = '0') {
      const child = Bun.spawn([process.execPath, script], {
        cwd: directory,
        env: {
          ...process.env,
          WORKERS_CI_BRANCH: branch,
          SITE_RELEASE: release,
          FIXTURE_EXIT: exit,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      return {
        code: await child.exited,
        out: await new Response(child.stdout).text(),
        err: await new Response(child.stderr).text(),
      };
    }
    for (const branch of [undefined, '', '   ']) {
      const result = await run(branch);
      expect(result.code).toBe(1);
      expect(result.err).toContain('WORKERS_CI_BRANCHが必要');
      expect(result.out).toBe('');
    }
    const production = await run('main');
    expect(production.code).toBe(0);
    expect(JSON.parse(production.out)).toEqual({
      branch: 'main',
      release: '1',
    });
    expect(JSON.parse((await run('main', '0')).out).release).toBe('0');
    const preview = await run('feature/seo');
    expect(preview.code).toBe(0);
    expect(JSON.parse(preview.out)).toEqual({
      branch: 'feature/seo',
      release: '0',
    });
    expect((await run('main', '1', '7')).code).toBe(7);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
