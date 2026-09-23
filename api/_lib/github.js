/* The GitHub Git Data API, over plain fetch.
 *
 * Everything the bot changes goes through commitChanges(), which builds ONE
 * commit out of however many files an operation touches. That matters twice
 * over: a Vercel deploy is triggered per commit, and a half-applied upload
 * (photos in, listing missing) would be worse than no upload at all. */

const API = 'https://api.github.com';

const REPO   = process.env.GITHUB_REPO   || 'Ahonkhai/watch';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

/* Vercel refuses to deploy a commit whose author is not a collaborator on the
 * repository, and it checks every author on the commit. The bot therefore
 * commits as the repository owner, and never adds a co-author. */
const AUTHOR = {
  name:  process.env.GIT_AUTHOR_NAME  || 'Ahonkhai',
  email: process.env.GIT_AUTHOR_EMAIL || '122228978+Ahonkhai@users.noreply.github.com',
};

async function gh(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'swizz-listing-bot',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`GitHub ${options.method || 'GET'} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/* Read a file as text. Returns null when it does not exist, which is the
 * normal case for a draft that has not been started yet. */
export async function readFile(path) {
  try {
    const r = await gh(`/repos/${REPO}/contents/${encodeURI(path)}?ref=${BRANCH}`);
    return Buffer.from(r.content, 'base64').toString('utf8');
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

/* Every file under a prefix, as [{ path, sha }]. Used to gather a draft's
 * photographs, and to delete a directory (which the API has no verb for). */
export async function listTree(prefix) {
  const head = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const commit = await gh(`/repos/${REPO}/git/commits/${head.object.sha}`);
  const tree = await gh(`/repos/${REPO}/git/trees/${commit.tree.sha}?recursive=1`);
  return tree.tree
    .filter((n) => n.type === 'blob' && n.path.startsWith(prefix))
    .map((n) => ({ path: n.path, sha: n.sha }));
}

/* changes: [{ path, content?, base64?, sha?, delete? }]
 *   content  utf8 text to write
 *   base64   binary to write, already base64 encoded
 *   sha      reuse an existing blob (how a draft photo becomes a listing
 *            photo without being downloaded and re-uploaded)
 *   delete   remove the path
 *
 * skipDeploy appends [skip ci], which Vercel honours. Draft steps use it so
 * that building a listing over several messages costs zero deploys; only the
 * publish commit actually ships. */
export async function commitChanges({ message, changes, skipDeploy = false }) {
  const subject = skipDeploy ? `${message} [skip ci]` : message;

  /* Two clients can be mid-commit at once — an album arrives as one webhook
   * call per photo. A stale base is a 409 from the ref update, so rebuild the
   * tree against the new head and try again. */
  for (let attempt = 0; attempt < 5; attempt++) {
    const head = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
    const baseSha = head.object.sha;
    const baseCommit = await gh(`/repos/${REPO}/git/commits/${baseSha}`);

    const entries = [];
    for (const c of changes) {
      if (c.delete) {
        entries.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
      } else if (c.sha) {
        entries.push({ path: c.path, mode: '100644', type: 'blob', sha: c.sha });
      } else {
        const encoding = c.base64 ? 'base64' : 'utf-8';
        const content = c.base64 ?? c.content;
        const blob = await gh(`/repos/${REPO}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content, encoding }),
        });
        entries.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }

    const tree = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: entries }),
    });

    const commit = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: subject,
        tree: tree.sha,
        parents: [baseSha],
        author: AUTHOR,
        committer: AUTHOR,
      }),
    });

    try {
      await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return commit.sha;
    } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      await new Promise((r) => setTimeout(r, 300 + attempt * 400));
    }
  }
  throw new Error('could not commit: the branch kept moving under us');
}
