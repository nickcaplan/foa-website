import {test,expect} from "@playwright/test";
for(const width of [390,1440])for(const theme of ["day","night"])for(const scale of [100,200])test(`Donations Day notices fit ${width} ${theme} ${scale}`,async({page})=>{
 await page.clock.install({time:new Date("2026-11-11T12:00:00Z")});await page.setViewportSize({width,height:1000});await page.addInitScript(theme=>{localStorage.setItem("foa-theme",theme);localStorage.setItem("foa-cookie-preferences","essential")},theme);
 for(const route of ["/","/events/christmas-fayre-2026/","/christmas-fayre-volunteering/"]){await page.goto(route);if(scale===200)await page.addStyleTag({content:"html{font-size:200%!important}"});const notice=page.locator(".fayre-donations-notice");await expect(notice).toBeVisible();await expect(notice).toContainText("Friday 20th November");expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
 await page.clock.setSystemTime(new Date("2026-11-21T00:00:00Z"));await page.goto("/events/christmas-fayre-2026/");await expect(page.locator(".fayre-donations-notice")).toBeHidden();
});
