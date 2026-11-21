"""Counts-only public sheet reader. One request per scheduled workflow.
No sign-ins, signup writes, names, contact fields, retries or raw HTML storage.
"""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json, re, sys

CONTENT = 'src/content/events/christmas-fayre-2026.json'
END = datetime.fromisoformat('2026-12-05T15:30:00+00:00')
DATE_LABEL = 'Sat, Dec 5'

def load_sheet():
    """Read the shared page URL and activity anchors from published event content."""
    with open(CONTENT) as f:
        event = json.load(f)
    sheets = {a['anchor']: a['name'] for a in event['signupActivities']}
    if len(sheets) != len(event['signupActivities']):
        raise ValueError('Duplicate activity anchors')
    return event['signupUrl'], sheets

URL, SHEETS = load_sheet()
UK = ZoneInfo('Europe/London')

def in_window(now=None):
    """Refresh only between 07:00 and 21:00 UK time, GMT or BST."""
    uk = (now or datetime.now(timezone.utc)).astimezone(UK)
    return 7 <= uk.hour < 21

class Element:
    def __init__(self, tag='', attrs=(), parent=None):
        """Store a minimal HTML node without preserving source content."""
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def has(self, cls):
        """Test a provider CSS class."""
        return cls in self.attrs.get('class','').split()
    def all(self):
        """Yield descendants without interpreting external markup as instructions."""
        for child in self.children:
            if isinstance(child, Element):
                yield child
                yield from child.all()
    def text(self):
        """Collect descendant text for validated count and time cells only."""
        return ''.join(c.text() if isinstance(c, Element) else c for c in self.children)
    def own_text(self):
        """Collect only direct text, so nested pills stay separate cells."""
        return ''.join(c for c in self.children if isinstance(c, str))
class Tree(HTMLParser):
    def __init__(self):
        """Start a small parser tree for one public response."""
        super().__init__(); self.root=Element(); self.current=self.root
    def handle_starttag(self, tag, attrs):
        """Append an element, respecting HTML void tags."""
        el=Element(tag, attrs, self.current); self.current.children.append(el)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.current=el
    def handle_endtag(self, tag):
        """Close the nearest matching HTML element, tolerating provider void tags."""
        el=self.current
        while el.parent:
            if el.tag==tag: self.current=el.parent; return
            el=el.parent
    def handle_data(self, text):
        """Attach text while parsing; the final output excludes personal cells."""
        self.current.children.append(text)

PILL = re.compile(r'^(\d+) of (\d+) open$')
TIME = re.compile(r'^' + DATE_LABEL.replace(' ', r'\s') + r'\s*·\s*(\d{1,2}):(\d{2})\s*([AP]M)\s*[–-]\s*(\d{1,2}):(\d{2})\s*([AP]M)$')

def hour(hour_text, marker):
    """Convert a strict 12-hour time to 24-hour."""
    hour = int(hour_text)
    if not 1 <= hour <= 12: raise ValueError('Unexpected slot hour')
    return hour % 12 + (12 if marker == 'PM' else 0)

def slot_rows(item):
    """Extract only validated end times and open counts from one slot."""
    texts = [el.own_text().strip() for el in item.all() if el.tag == 'div']
    times = [t for t in texts if TIME.match(t)]
    pills = [t for t in texts if PILL.match(t) or t == 'Full · waitlist']
    if len(times) != 1 or len(pills) != 1: raise ValueError('Missing or conflicting slot cells')
    start_h, start_m, start_ap, end_h, end_m, end_ap = TIME.match(times[0]).groups()
    startAt = datetime(2026, 12, 5, hour(start_h, start_ap), int(start_m), tzinfo=timezone.utc)
    endAt = datetime(2026, 12, 5, hour(end_h, end_ap), int(end_m), tzinfo=timezone.utc)
    if startAt >= endAt or endAt > END: raise ValueError('Unexpected slot boundary')
    pill = pills[0]
    if pill == 'Full · waitlist':
        # The full pill carries no numbers; capacity stays unknown unless the
        # provider payload or an earlier snapshot supplies it (see parse/fetch).
        opened, capacity = 0, None
    else:
        opened, capacity = (int(n) for n in PILL.match(pill).groups())
        if opened > capacity: raise ValueError('Open places exceed capacity')
        if capacity > 20: raise ValueError('Unexpected capacity')
    return {'endsAt': endAt.isoformat(), 'open': opened, 'capacity': capacity}

def carry_capacity(rows, sources, code):
    """Fill unknown full-slot capacities from earlier snapshots, oldest first.

    A capacity is static context, not a count: carrying one forward never
    changes open places, and a live provider pill always wins. Sources are
    consulted in order, so the previous published snapshot overrides the
    committed seed. The full pill carries no numbers, so without this carry a
    slot that fills is lost from the public total - and one refresh that runs
    with an unreadable previous snapshot would erase the history for good.
    """
    known = {}
    for source in sources:
        old = (source or {}).get('activities', {}).get(code) or {}
        for row in old.get('rows') or []:
            capacity = row.get('capacity') if isinstance(row, dict) else None
            if type(capacity) is int and 1 <= capacity <= 20:
                known[row.get('endsAt')] = capacity
    for row in rows:
        if row['capacity'] is None and known.get(row['endsAt']) is not None:
            row['capacity'] = known[row['endsAt']]
    return rows

def payload_quantities(page):
    """Extract per-slot capacities from the provider's embedded page payload.

    The public page embeds a Next.js data script whose decoded text holds one
    JSON object {slug, sections:[{id, needs:[{end, quantity, filled, remaining,
    full}]}]}. Returns {section_id: {end_iso: (quantity, filled,
    remaining, full)}}. Names are never read, returned, stored or output. Returns {} when the payload is absent or
    malformed, leaving callers with pill-only data, exactly as before.
    """
    text = ''
    decoder = json.JSONDecoder()
    for script in re.findall(r'<script[^>]*>(.*?)</script>', page, re.S):
        for match in re.finditer(r'self\.__next_f\.push\(', script):
            try:
                chunk, _ = decoder.raw_decode(script[match.end():])
            except ValueError:
                return {}
            if isinstance(chunk, list) and len(chunk) == 2 and isinstance(chunk[1], str):
                text += chunk[1]
    data = None
    for marker in re.finditer(r'\{"slug":"[a-z0-9]+"', text):
        try:
            candidate, _ = decoder.raw_decode(text[marker.start():])
        except ValueError:
            continue
        if candidate.get('slug') == URL.rstrip('/').split('/')[-1] and isinstance(candidate.get('sections'), list):
            data = candidate
            break
    if data is None:
        return {}
    capacities = {}
    for section in data['sections']:
        if not isinstance(section, dict): return {}
        if section.get('kind') != 'shift': continue
        if not isinstance(section.get('needs'), list): return {}
        needs = {}
        for need in section['needs']:
            try:
                quantity, filled, remaining = need['quantity'], need['filled'], need['remaining']
                full = need['full']
                if any(type(n) is not int for n in (quantity, filled, remaining)) or type(full) is not bool: return {}
                end = datetime.fromisoformat(str(need['end']).replace('Z', '+00:00'))
            except (KeyError, TypeError, ValueError):
                return {}
            if not 1 <= quantity <= 20 or filled < 0 or remaining < 0: return {}
            if filled + remaining != quantity or full != (remaining == 0): return {}
            key = end.isoformat()
            if key in needs: return {}
            needs[key] = (quantity, filled, remaining, full)
        if needs:
            section_id = section.get('id')
            if not isinstance(section_id, str) or section_id in capacities: return {}
            capacities[section_id] = needs
    return capacities

def parse(html, anchor, payload=None):
    """Extract validated rows for one activity section, nothing personal."""
    parser = Tree(); parser.feed(html)
    sections = [el for el in parser.root.all() if el.tag == 'section' and el.attrs.get('id') == anchor]
    if len(sections) != 1: raise ValueError('Expected one activity section')
    names = [el for el in sections[0].children if isinstance(el, Element) and el.tag == 'h2']
    if len(names) != 1 or names[0].text().strip() != SHEETS[anchor]: raise ValueError('Unexpected activity name')
    lists = [el for el in sections[0].children if isinstance(el, Element) and el.tag == 'ul']
    if len(lists) != 1: raise ValueError('Expected one slot list')
    items = [el for el in lists[0].children if isinstance(el, Element)]
    if not items or any(el.tag != 'li' for el in items): raise ValueError('Malformed slot list')
    rows = [slot_rows(item) for item in items]
    if not rows: raise ValueError('No slots parsed')
    if payload is not None:
        if set(payload) != {row['endsAt'] for row in rows}: raise ValueError('Provider payload disagrees with pill list')
        for row in rows:
            quantity, filled, remaining, full = payload[row['endsAt']]
            if row['capacity'] is None:
                # Full pill: take the capacity the provider exposes for this slot.
                if not full or remaining != 0: raise ValueError('Provider payload disagrees with pill')
                row['capacity'] = quantity
            elif full or remaining != row['open'] or quantity != row['capacity']:
                raise ValueError('Provider payload disagrees with pill')
    return rows

def fetch(now=None, previous=None, seed=None):
    """Read the public page once, fail closed, and never start a post-cutoff request."""
    now = now or datetime.now(timezone.utc)
    data = {'schema':1,'checkedAt':now.isoformat(),'eventEndsAt':END.isoformat(),'activities':{}}
    if now >= END:
        data['ended'] = True
        return data  # Stop provider reads after the latest clear-up end.
    if not in_window(now):
        # Overnight: keep the last published counts rather than reading the provider.
        return previous or data
    try:
        if datetime.now(timezone.utc) >= END: raise ValueError('Past cutoff')
        request = Request(URL, headers={'User-Agent':'FriendsOfAshley-availability/1.0 (15-minute public counts)'})
        with urlopen(request, timeout=20) as response:
            if response.status != 200: raise ValueError('Source unavailable')
            payload = response.read(2000001)
            if len(payload) > 2000000: raise ValueError('Oversized response')
            html = payload.decode('utf-8')
    except Exception:
        html = None
    capacities = payload_quantities(html) if html is not None else {}
    for code, name in SHEETS.items():
        try:
            if html is None: raise ValueError('Source unavailable')
            rows = carry_capacity(parse(html, code, capacities.get(code[2:])), [seed, previous], code)
            data['activities'][code] = {'name':name,'rows':rows,'checkedAt':now.isoformat()}
        except Exception:
            old = (previous or {}).get('activities', {}).get(code)
            data['activities'][code] = old if old and not old.get('unavailable') else {'name':name,'unavailable':True}
            print('Availability unavailable for '+code, file=sys.stderr)
    return data

def validate_snapshot(data):
    """Reject unknown fields, personal data, invalid dates and malformed published counts."""
    if not isinstance(data,dict) or set(data)-{'schema','checkedAt','eventEndsAt','activities','ended','preview'} or data.get('schema')!=1: raise ValueError('Invalid snapshot')
    if data.get('eventEndsAt')!=END.isoformat(): raise ValueError('Wrong event')
    if not isinstance(data.get('activities'),dict): raise ValueError('Invalid activities')
    for code,activity in data['activities'].items():
        if code not in SHEETS or set(activity)-{'name','rows','checkedAt','unavailable'}: raise ValueError('Invalid activity')
        if activity.get('name')!=SHEETS[code]: raise ValueError('Wrong activity')
        if activity.get('unavailable') is True: continue
        datetime.fromisoformat(activity['checkedAt'])
        if not isinstance(activity.get('rows'),list) or not activity['rows']: raise ValueError('Missing rows')
        for row in activity['rows']:
            if set(row)!={'endsAt','open','capacity'} or type(row['open']) is not int or not 0<=row['open']<=20: raise ValueError('Invalid count')
            if row['capacity'] is not None and (type(row['capacity']) is not int or not 1<=row['capacity']<=20 or row['capacity']<row['open']): raise ValueError('Invalid capacity')
            end=datetime.fromisoformat(row['endsAt'])
            if end.tzinfo is None or end>END: raise ValueError('Invalid end')
    return data

def fresh_seed(seed, now, allow_stale=False):
    """Accept only complete, validated, fresh counts, without preview metadata."""
    try:
        candidate = validate_snapshot(seed)
        for code in SHEETS:
            activity = candidate['activities'][code]
            checked = datetime.fromisoformat(activity['checkedAt'])
            if activity.get('unavailable') or checked > now or (not allow_stale and (now-checked).total_seconds() > 5400):
                raise ValueError('Seed is not fresh')
        candidate = dict(candidate)
        candidate.pop('preview', None)
        return candidate
    except Exception:
        return None

def preserve(url, now=None, seed=None):
    """Preserve published counts unless a complete fresh committed seed is newer."""
    now=now or datetime.now(timezone.utc)
    if now>=END:
        return {"schema":1,"checkedAt":now.isoformat(),"eventEndsAt":END.isoformat(),"activities":{},"ended":True}
    candidate = fresh_seed(seed, now, allow_stale=True)
    try:
        with urlopen(Request(url,headers={'User-Agent':'FriendsOfAshley-count-preservation/1.0'}),timeout=20) as response:
            payload=response.read(100001)
            if len(payload)>100000: raise ValueError('Oversized snapshot')
            raw = json.loads(payload)
        # Validate envelope once, then salvage each independent activity. One bad
        # timestamp must not erase newer good history from the other sheets.
        if not isinstance(raw,dict) or set(raw)-{'schema','checkedAt','eventEndsAt','activities','ended','preview'} or raw.get('schema') != 1 or raw.get('eventEndsAt') != END.isoformat() or not isinstance(raw.get('activities'),dict):
            raise ValueError('Invalid snapshot envelope')
        activities = {}
        for code, activity in raw['activities'].items():
            try:
                validate_snapshot(dict(raw, activities={code:activity}))
                if not activity.get('unavailable'):
                    checked = datetime.fromisoformat(activity['checkedAt'])
                    if checked.tzinfo is None or checked > now: raise ValueError('Invalid check time')
                activities[code] = activity
            except (ValueError, TypeError, KeyError, AttributeError):
                continue
        published = dict(raw, activities=activities)
        if candidate is not None:
            # Keep the newest validated history independently for each activity.
            activities = dict(published['activities'])
            for code in SHEETS:
                previous = activities.get(code)
                incoming = candidate['activities'][code]
                if previous is None or previous.get('unavailable') or datetime.fromisoformat(incoming['checkedAt']) > datetime.fromisoformat(previous['checkedAt']):
                    activities[code] = incoming
            published = dict(published, activities=activities)
        return published
    except Exception:
        # Never substitute the committed seed here: with the published snapshot
        # unreadable there is no way to know whether the seed is newer, so returning
        # it can (and did, 17 Nov 2026) replace newer published history with stale
        # counts. Deploy with no counts instead - the site hides them until a
        # scheduled refresh publishes fresh counts (recovery timing is not
        # guaranteed while the scheduler reliability in #183 is unresolved).
        print('WARNING availability preserve: published snapshot unreadable; deploying WITHOUT counts rather than substituting the committed seed',file=sys.stderr)
        return {'schema':1,'checkedAt':None,'eventEndsAt':END.isoformat(),'activities':{}}

if __name__=='__main__':
    output=sys.argv[1] if len(sys.argv)>1 else 'assets/fayre-availability.json'
    seed = None
    try:
        with open(output) as f: seed = json.load(f)
    except (OSError, ValueError): pass
    previous = preserve('https://www.thefriendsofashley.org/fayre-availability.json', seed=seed)
    data = previous if '--preserve' in sys.argv else fetch(previous=previous, seed=seed)
    with open(output,'w') as f: json.dump(data,f,separators=(',',':'))
