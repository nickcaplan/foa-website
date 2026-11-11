import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const event=JSON.parse(await readFile("src/content/events/christmas-fayre-donations-day-2026.json","utf8"));
test("Donations Day contains only confirmed date facts",()=>{
 assert.equal(event.start,"2026-11-20T00:00:00+00:00");assert.equal(event.allDay,true);assert.equal(event.location,"");assert.equal(event.end,undefined);
 assert.equal(new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:"Europe/London"}).format(new Date(event.start)),"Friday");
});
test("Donations Day notices agree across the public pages without invented items",async()=>{
 for(const route of ["","events/christmas-fayre-2026","christmas-fayre-volunteering"]){
 const html=await readFile(`dist/${route?route+"/":""}index.html`,"utf8");
 const notice=html.match(/<aside[^>]*class="fayre-donations-notice"[\s\S]*?<\/aside>/)?.[0];assert.ok(notice,route);assert.ok(notice.includes("Friday 20th November"));assert.ok(notice.includes('data-expires-on="2026-11-21"'));assert.doesNotMatch(notice,/TBC|to be confirmed|items to follow|drop.off|bottles|toys|08:|09:/i);
 }
 const whatsOn=await readFile("dist/whats-on/index.html","utf8");assert.ok(whatsOn.includes('data-event-title="Christmas Fayre Donations Day"'));assert.ok(whatsOn.includes("Friday 20th November"));
 const reps=await readFile("dist/reps/index.html","utf8");const builtAt=Date.parse(reps.match(/data-built-at="([^"]+)"/)?.[1] || "");assert.ok(Number.isFinite(builtAt));assert.equal(reps.includes("Donations Day for the Christmas Fayre is on Friday 20th November."),builtAt<Date.parse("2026-11-21T00:00:00Z"));
});
