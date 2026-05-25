'use strict';

const DEFAULT_REPO = 'sidmsmith/halbach-us';
const WORKFLOW_FILE = 'sync-plumlee-availability.yml';

async function triggerGithubAvailabilitySync() {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    const err = new Error(
      'GITHUB_SYNC_TOKEN is not set on Vercel. Add a GitHub PAT with workflow scope, or run sync from GitHub Actions.'
    );
    err.code = 'GITHUB_SYNC_NOT_CONFIGURED';
    throw err;
  }

  const repo = process.env.GITHUB_REPO || DEFAULT_REPO;
  const parts = repo.split('/');
  if (parts.length !== 2) {
    throw new Error('GITHUB_REPO must be owner/repo');
  }

  const ref = process.env.GITHUB_SYNC_REF || 'main';
  const url =
    'https://api.github.com/repos/' +
    encodeURIComponent(parts[0]) +
    '/' +
    encodeURIComponent(parts[1]) +
    '/actions/workflows/' +
    encodeURIComponent(WORKFLOW_FILE) +
    '/dispatches';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: ref }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      'Failed to start GitHub sync workflow (HTTP ' +
        response.status +
        '): ' +
        text.slice(0, 200)
    );
  }

  return {
    ok: true,
    triggered: true,
    message:
      'Sync started on GitHub Actions. This usually completes within a minute.',
    repo: repo,
    ref: ref,
  };
}

module.exports = { triggerGithubAvailabilitySync, WORKFLOW_FILE };
