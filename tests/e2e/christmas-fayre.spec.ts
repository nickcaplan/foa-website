import{expect,test}from'@playwright/test';
const route='/events/christmas-fayre-2026/';
for(const width of [320,390,768,1024,1440])test(`Fayre retains facts and no overflow at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(route);
 await expect(page.getByRole('heading',{level:1,name:'Christmas Fayre'})).toBeVisible();
 await expect(page.locator('.xmas-area')).toHaveCount(0);
 await expect(page.locator('.narnia-landscape__date')).toContainText('Saturday 5th December');
 await expect(page.locator('.narnia-landscape__time')).toHaveText('12:00 - 15:00');
 await expect(page.locator('.xmas-contact__leads')).toContainText('Rachel Briscoe');
 await expect(page.locator('.xmas-contact__leads')).toContainText('Sophie Glass');
 await expect(page.locator('.narnia-landscape__footer img')).toBeVisible();
 await expect(page.locator('.add-calendar')).toHaveCount(0);
 await expect(page.locator('.xmas-stalls-cta a')).toHaveAttribute('href','/christmas-fayre-volunteering/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});
test('click-out matches Fireworks volunteering safety and loads no third-party board',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/justsignup|posthog|vercel-storage/.test(r.url()))requests.push(r.url())});
 await page.goto('/christmas-fayre-volunteering/');
 const signup=page.getByRole('link',{name:'Sign up (opens JustSignup in a new tab)'});
 await expect(signup).toHaveAttribute('href','https://justsignup.io/s/uhyd1u3wq4');
 await expect(signup).toHaveAttribute('target','_blank');await expect(signup).toHaveAttribute('rel','noopener noreferrer');
 await expect(signup.locator('.external-link-icon')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('iframe')).toHaveCount(0);expect(requests).toEqual([]);
 await signup.focus();await expect(signup).toBeFocused();
 await expect(page.getByRole('link',{name:/Email (?:us \(the Fayre team\)|the Fayre team)/})).toHaveCount(1);
 await expect(page.locator('meta[name=robots][content*=noindex]')).toHaveCount(0);
 await expect(page.getByText('Design preview only')).toHaveCount(0);
});
test('snow stays outside the reading area and honours reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);
 await expect(page.locator('.narnia-landscape[data-hero-snow] .xmas-snow')).toHaveAttribute('aria-hidden','true');
 expect(await page.locator('.xmas-snow__bank').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 expect(await page.locator('.xmas-snow i').evaluateAll(els=>els.filter(e=>getComputedStyle(e).animationName!=='none').length)).toBe(0);
});
test.describe('without JavaScript',()=>{test.use({javaScriptEnabled:false});test('sign-up link and contact remain available',async({page})=>{
 await page.goto(route);await expect(page.getByRole('link',{name:/Volunteer/}).first()).toBeVisible();await expect(page.getByRole('link',{name:/Email (?:us \(the Fayre team\)|the Fayre team)/})).toBeVisible();
});});

test('What’s On Fayre item keeps details and links to volunteering',async({page})=>{await page.goto('/whats-on/');const row=page.locator('[data-event-title="Christmas Fayre"][data-past="false"]');await expect(row.getByRole('link',{name:'Christmas Fayre',exact:true})).toHaveAttribute('href',route);await expect(row.getByRole('link',{name:'Volunteer',exact:true})).toHaveAttribute('href','/christmas-fayre-volunteering/');await expect(row.locator('a a')).toHaveCount(0);});

for (const width of [320, 390]) {
  test(`Glitter Tree, Volunteer and Art Competition CTAs share one width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(route);
    const widths = await page.evaluate(() => {
      const widths_of = (selector: string) => [...document.querySelectorAll(selector)].map((e) => e.getBoundingClientRect().width);
      return {
        supporter: widths_of('.fayre-supporter a.button'),
        volunteer: widths_of('.xmas-stalls-cta .button'),
        art: widths_of('.xmas-art-cta .button'),
      };
    });
    for (const [name, list] of Object.entries(widths)) expect(list.length, `${name} CTA present`).toBeGreaterThan(0);
    const all = [...widths.supporter, ...widths.volunteer, ...widths.art];
    expect(Math.max(...all) - Math.min(...all), 'all three CTAs span the same width').toBeLessThanOrEqual(1);
    expect(Math.min(...all), 'CTAs reach the standard 16px gutter').toBeGreaterThanOrEqual(width - 33);
  });
}

for(const width of [320,390,1024]) for(const scale of [1,2]) test(`hero snow stays clear of sponsor at ${width}/${scale}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);
 await page.evaluate(scale=>document.documentElement.style.fontSize=`${16*scale}px`,scale);
 const geometry=await page.evaluate(()=>{
  const box=(s:string)=>document.querySelector(s)!.getBoundingClientRect();
  const hero=box('.narnia-landscape'),snow=box('.xmas-snow'),bank=box('.xmas-snow__bank'),logo=box('.sponsor-ribbon img');
  return {contained:snow.top>=hero.top&&snow.bottom<=hero.bottom,gap:bank.top-logo.bottom};
 });
 expect(geometry.contained).toBe(true);expect(geometry.gap).toBeGreaterThanOrEqual(12);
});

for(const width of [320,390]) test(`snow adds no hero height at 200% text @${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto(route);
 const normalPad=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.narnia-landscape__footer')!).paddingBottom));
 // 200% browser text: stripping the whole snow feature (attribute-gated styles +
 // snow layer) must leave the hero height untouched, and the bank clearance must
 // have tapered back to the shared 0.75rem footer padding (24px at a 32px root).
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');
 await page.waitForTimeout(100);
 const r=await page.evaluate(()=>{
  const hero=document.querySelector('.narnia-landscape')!;
  const withSnow=hero.getBoundingClientRect().height;
  const padBottom=parseFloat(getComputedStyle(hero.querySelector('.narnia-landscape__footer')!).paddingBottom);
  hero.removeAttribute('data-hero-snow');
  hero.querySelector('.xmas-snow')!.remove();
  return {withSnow,withoutSnow:hero.getBoundingClientRect().height,padBottom};
 });
 expect(normalPad,'100% text keeps the 48px bank clearance').toBe(48);
 expect(r.padBottom,'200% text falls back to the shared 0.75rem footer padding').toBe(24);
 expect(r.withoutSnow,'stripping the snow feature at 200% text changes the hero height by nothing').toBe(r.withSnow);
});
