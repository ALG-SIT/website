export {};

const branch = process.env.WORKERS_CI_BRANCH?.trim();

if (!branch) {
  console.error('Workers BuildsにはWORKERS_CI_BRANCHが必要です');
  process.exit(1);
}

const child = Bun.spawn([process.execPath, 'run', 'build'], {
  env: {
    ...process.env,
    WORKERS_CI_BRANCH: branch,
    SITE_RELEASE: branch === 'main' ? process.env.SITE_RELEASE : '0',
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

process.exit(await child.exited);
