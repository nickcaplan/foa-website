/** Netlify: exit 0 skips, exit 1 builds. All uncertainty skips.
 * https://docs.netlify.com/build/configure-builds/ignore-builds/
 * Only `preview` + `netlify` opts into a Netlify PR preview.
 */
export async function shouldBuild(env, request = fetch) {
  const {CONTEXT, PULL_REQUEST, REVIEW_ID} = env;
  if (CONTEXT !== 'deploy-preview' || PULL_REQUEST !== 'true' || !/^[1-9]\d*$/.test(REVIEW_ID || '')) return false;
  try {
    const res = await request(`https://api.github.com/repos/nickcaplan/foa-website/pulls/${REVIEW_ID}`, {
      headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'netlify-ignore'},
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return false;
    const pr = await res.json();
    if (pr.state !== 'open' || pr.number !== Number(REVIEW_ID) ||
        pr.base?.repo?.full_name !== 'nickcaplan/foa-website' || pr.base.ref !== 'main' ||
        pr.head?.repo?.full_name !== 'nickcaplan/foa-website' || !Array.isArray(pr.labels)) return false;
    const names = pr.labels.map(label => label.name);
    return names.includes('preview') && names.includes('netlify') && !names.includes('cloudflare');
  } catch { return false; }
}
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const build = await shouldBuild(process.env);
  console.log(build ? 'Explicit Netlify preview requested: building.' : 'No verified Netlify preview request: skipping.');
  process.exit(build ? 1 : 0);
}
