import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('every generated footer uses the current Websites by Nick destination', async () => {
  const visit = async dir => {
    const files = await readdir(dir, {withFileTypes:true});
    for (const file of files) {
      const name = path.join(dir, file.name);
      if (file.isDirectory()) await visit(name);
      else if (file.name.endsWith('.html')) {
        const html = await readFile(name, 'utf8');
        const credits = [...html.matchAll(/<a\b[^>]*class="designer-credit"[^>]*>/g)];
        for (const [tag] of credits) {
          assert.match(tag, /href="https:\/\/websitesbynick\.co\.uk\/"/, name);
          assert.match(tag, /target="_blank"/, name);
          assert.match(tag, /rel="noopener noreferrer"/, name);
        }
        // The standalone contact-form prototype has no designer credit.
        if (html.includes('class="site-footer"') && file.name !== 'playground.html') assert.equal(credits.length, 1, name);
      }
    }
  };
  await visit('dist');
});
