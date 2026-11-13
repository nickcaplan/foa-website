// Loaded only from the trusted base checkout by pull_request_target.
module.exports = async ({github, context, core}) => {
  const {owner, repo} = context.repo;
  const number = context.payload.pull_request.number;
  const {data: pr} = await github.rest.pulls.get({owner, repo, pull_number: number});
  const labels = pr.labels.map(x => x.name);
  const selected = pr.state === 'open' && pr.base.ref === 'main' &&
    pr.head.repo?.full_name === `${owner}/${repo}` &&
    labels.includes('preview') && !labels.includes('netlify');
  const prefix = `heads/preview/pr-${number}/`;
  const refs = await github.paginate(github.rest.git.listMatchingRefs, {owner, repo, ref: prefix});
  const valid = refs.filter(x => new RegExp(`^refs/${prefix}[a-f0-9]{40}$`).test(x.ref));
  const wanted = `${prefix}${pr.head.sha}`;
  if (selected && !valid.some(x => x.ref === `refs/${wanted}`)) {
    const {data: head} = await github.rest.git.getCommit({owner, repo, commit_sha: pr.head.sha});
    // Preserve the exact tree, but not a PR commit's [CF-Pages-Skip] message.
    const {data: commit} = await github.rest.git.createCommit({owner, repo,
      message: `Preview PR #${number} at ${pr.head.sha}`, tree: head.tree.sha, parents: [pr.head.sha]});
    // Recheck after network calls: a removed label or newer head cancels publication.
    const {data: latest} = await github.rest.pulls.get({owner, repo, pull_number: number});
    const names = latest.labels.map(x => x.name);
    if (latest.state !== 'open' || latest.head.sha !== pr.head.sha ||
        !names.includes('preview') || names.includes('netlify')) {
      core.info('Preview request changed; no branch published.'); return;
    }
    await github.rest.git.createRef({owner, repo, ref: `refs/${wanted}`, sha: commit.sha});
    core.info(`Published ${wanted}`);
  }
  // Never force-update a ref. Remove only this PR's controlled immutable refs.
  for (const ref of valid) {
    if (selected && ref.ref === `refs/${wanted}`) continue;
    await github.rest.git.deleteRef({owner, repo, ref: ref.ref.replace(/^refs\//, '')});
  }
  core.info(selected ? 'One Cloudflare preview ref retained.' : 'No Cloudflare preview requested.');
};
