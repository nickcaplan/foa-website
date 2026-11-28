# Site agent helpers

Small helpers used when preparing and checking pull requests. They read pages and files only. Playwright comes from the repo's existing dev dependency, nothing to install.

- `shot.mjs`: screenshot one element for PR before/after images. `node qa/site-agent/shot.mjs <baseUrl> <path> <selector> <out.png> [width] [day|night] [textScale]`. Serve a built `dist/` first, for example `cd dist && python3 -m http.server 4399`.
- `measure.mjs`: reports sideways overflow and clipped text for one element at the given width, theme and text scale. `node qa/site-agent/measure.mjs <baseUrl> <path> <selector> [width] [day|night] [textScale]`.
- `newsletter-doc-diff.py`: turns the exported newsletter Google Doc (JSON with a `content` HTML field) into plain block lines, with Google redirect links unwrapped, so two exports can be diffed. `python3 qa/site-agent/newsletter-doc-diff.py doc.json > blocks.txt`.

Notes:
- FOA theme key is localStorage `foa-theme` = day | night.
- Text scale is set by changing the root font size, 16px times the scale.
- The cookie banner is hidden in screenshots with a style tag, never by clicking through it.
