import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

test('newsletter removes known missing glyphs but preserves verified symbols', () => {
  for (const name of readdirSync('src/content/newsletters')) {
    const text = readFileSync(`src/content/newsletters/${name}`, 'utf8');
    assert.doesNotMatch(text, /[👀🎆🎄👕📱🌟🎅💚👥📅🎨🔗👇🤝🎉📧📢💙]/u, name);
  }
  assert.match(readFileSync('src/content/newsletters/half-term-2026.json', 'utf8'), /👁️/u);
  assert.match(readFileSync('src/content/newsletters/autumn-term-2026.json', 'utf8'), /♥️/u);
  assert.match(readFileSync('src/content/newsletters/autumn-term-2026.json', 'utf8'), /☕/u);
  assert.match(readFileSync('src/content/newsletters/back-to-school-2026.json', 'utf8'), /☕/u);
});
