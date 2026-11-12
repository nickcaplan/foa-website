import {expect,test} from '@playwright/test';
const routes=['/','/about/','/christmas-fayre-art-competition/','/christmas-fayre-volunteering/','/committee/','/contact/','/fundraising/','/get-involved/','/meeting-minutes/','/newsletter/','/privacy/','/reps/','/uniform/','/whats-on/','/events/christmas-fayre-2026/'];
for(const width of [1024,1280,1440])for(const route of routes){
 test(`${route}: header matches opening panel at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto(route);
  const layout=await page.evaluate(()=>{
   const h=document.querySelector('.header-inner')!.getBoundingClientRect();
   const p=document.querySelector('.art-comp-banner,.narnia-landscape,.view-hero')!.getBoundingClientRect();
   const nav=[...document.querySelectorAll('.desktop-nav a')].map(a=>a.getBoundingClientRect().top);
   return{hl:h.left,hr:h.right,pl:p.left,pr:p.right,nav,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(Math.abs(layout.hl-layout.pl)).toBeLessThan(1);expect(Math.abs(layout.hr-layout.pr)).toBeLessThan(1);
  if(width>=1280)expect(Math.max(...layout.nav)-Math.min(...layout.nav)).toBeLessThan(1);
  expect(layout.overflow).toBeLessThanOrEqual(0);
 });
}
