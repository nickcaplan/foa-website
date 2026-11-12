import{expect,test}from'@playwright/test';
const route='/events/christmas-fayre-2026/';
for(const width of [320,390,768,1024,1440])test(`Fayre retains facts and no overflow at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(route);
 await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 await expect(page.locator('[data-fayre-help-roles]')).toContainText('Fun Zone');await expect(page.locator('.xmas-area')).toHaveCount(0);
 await expect(page.locator('.narnia-landscape__date')).toContainText('Saturday 5th December');
 await expect(page.locator('.narnia-landscape__time')).toHaveText('12:00 - 15:00');
 await expect(page.locator('.fayre-leads')).toContainText('Rachel Briscoe');
 await expect(page.locator('.fayre-leads')).toContainText('Sophie Glass');
 await expect(page.locator('.narnia-landscape__footer img')).toBeVisible();
 await expect(page.locator('.add-calendar')).toHaveCount(0);
 await expect(page.locator('.xmas-stalls-cta a')).toHaveAttribute('href','/christmas-fayre-volunteering/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
test('click-out matches Fireworks volunteering safety and loads no third-party board',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/justsignup|posthog|vercel-storage/.test(r.url()))requests.push(r.url())});
 await page.goto('/christmas-fayre-volunteering/');
 const signup=page.getByRole('link',{name:'Sign up on JustSignup (opens JustSignup in a new tab)'});
 await expect(signup).toHaveAttribute('href','https://justsignup.io/s/uhyd1u3wq4');
 await expect(signup).toHaveAttribute('target','_blank');await expect(signup).toHaveAttribute('rel','noopener noreferrer');
 await expect(signup.locator('.external-link-icon')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('iframe')).toHaveCount(0);expect(requests).toEqual([]);
 await signup.focus();await expect(signup).toBeFocused();
 await expect(page.getByRole('link',{name:/Email the Fayre team/})).toHaveCount(1);
 await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(0);
 await expect(page.getByText('Design preview only')).toHaveCount(0);
});
test('snow stays outside the reading area and honours reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);
 await expect(page.locator('.xmas-snow')).toHaveAttribute('aria-hidden','true');
 expect(await page.locator('.xmas-snow i').evaluateAll(els=>els.filter(e=>getComputedStyle(e).animationName!=='none').length)).toBe(0);
});
test.describe('without JavaScript',()=>{test.use({javaScriptEnabled:false});test('sign-up link and contact remain available',async({page})=>{
 await page.goto(route);await expect(page.getByRole('link',{name:/Volunteer/}).first()).toBeVisible();await expect(page.locator('[data-fayre-help-roles]')).toContainText('Fun Zone');await expect(page.locator('.xmas-area')).toHaveCount(0);await expect(page.getByRole('link',{name:/Email the Fayre team/})).toBeVisible();
});});

test('What’s On Fayre item keeps details and links to volunteering',async({page})=>{await page.goto('/whats-on/');const row=page.locator('[data-event-title="Christmas Fayre"][data-past="false"]');await expect(row.getByRole('link',{name:'Christmas Fayre',exact:true})).toHaveAttribute('href',route);await expect(row.getByRole('link',{name:'Volunteer',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');await expect(row.locator('a a')).toHaveCount(0);});
