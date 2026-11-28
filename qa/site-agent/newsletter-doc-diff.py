import html
import json
import re
import sys
from urllib.parse import parse_qs, urlparse

# Usage: newsletter-doc-diff.py doc.json > blocks.txt
# doc.json is an export with a "content" HTML field. Prints one line per heading, paragraph or list item.

def unwrap(url):
    url = html.unescape(url)
    return parse_qs(urlparse(url).query).get("q", [url])[0]

content = json.load(open(sys.argv[1]))["content"]
body = content[content.find("<body"):]
lines = []
for m in re.finditer(r"<(h[1-6]|p|li)\b[^>]*>(.*?)</\1>", body, re.S):
    text = re.sub(
        r'<a [^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        lambda x: "[%s](%s)" % (re.sub("<[^>]+>", "", x.group(2)), unwrap(x.group(1))),
        m.group(2),
        flags=re.S,
    )
    text = html.unescape(re.sub("<[^>]+>", "", text)).strip()
    if text:
        lines.append(m.group(1)[0] + " | " + text)
print("\n".join(lines))
