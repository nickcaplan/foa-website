import { expect, test } from '@playwright/test';
// The old interactive routes redirect home. Historical downloadable files stay
// available independently; redirect rules must not swallow PDFs or ICS files.
test('archived event guide PDF remains retrievable',async({page})=>{const r=await page.request.get('/events/fireworks-2026-event-guide.pdf');expect(r.status()).toBe(200);expect(r.headers()['content-type']).toContain('application/pdf')});
test('archived event calendar remains retrievable',async({page})=>{const r=await page.request.get('/calendar/fireworks-2026.ics');expect(r.status()).toBe(200);expect(await r.text()).toContain('SUMMARY:Fireworks on the Field')});
