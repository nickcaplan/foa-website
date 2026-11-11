// Provider readiness is recorded only after a successful Pages branch deployment.
export const previewConfig={netlifyTeam:'nickcaplan',cloudflareReady:true};
export function selectNetlifyAccount(accounts,team){
 const account=accounts.find(a=>a.slug===team||a.id===team);
 if(!account)throw new Error('Configured Netlify team is not accessible');
 return account.id||account.slug;
}
export function readPreviewPullRequest(response){
 if(!response.ok||!Array.isArray(response.json))throw new Error('PR lookup failed. No push performed.');
 return response.json[0]||null;
}
export function choosePreviewProvider(used,threshold,ready){return used>=threshold&&ready?'cloudflare':'netlify'}
