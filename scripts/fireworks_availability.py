"""Counts-only public sheet reader. One request per sheet per scheduled workflow.
No sign-ins, signup writes, names, contact fields, retries or raw HTML storage.
"""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json, re, sys
from urllib.error import HTTPError

SHEETS = {'QCAFK':'Prize table','LPEDP':'Bar','73EL7':'Entrance','RACHX':'Tokens'}
END = datetime.fromisoformat('2026-11-05T19:00:00+00:00')
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
def parse(html):
    """Extract only validated end times and one responsive Open count per row."""
    parser=Tree(); parser.feed(html)
    roots=[el for el in parser.root.all() if el.attrs.get('id')=='rows']
    if len(roots)!=1: raise ValueError('Expected one public sheet rows container')
    rows=[]
    children = [el for el in roots[0].children if isinstance(el, Element)]
    for container in children:
        if container.tag == 'div' and container.has('row') and container.has('persist-header'):
            headers = [el for el in container.children if isinstance(el, Element)]
            if len(headers) != 3 or not all(el.tag == 'div' and el.has('header') for el in headers) or headers[1].text().strip() != 'Open':
                raise ValueError('Malformed sheet header')
            continue
        if container.tag == 'a':
            wrapped = [el for el in container.children if isinstance(el, Element)]
            if len(wrapped) != 1: raise ValueError('Unsupported shift wrapper')
            row = wrapped[0]
        else:
            row = container
        if row.tag != 'div' or not row.has('row') or not row.has('vertical-align'):
            raise ValueError('Malformed shift row')
        cols=[el for el in row.children if isinstance(el,Element) and el.tag=='div']
        if len(cols)!=3 or not cols[1].has('col-sm-2'): raise ValueError('Unexpected row columns')
        times=[el.text().strip() for el in cols[0].all() if el.has('ellipsis') and el.has('indent') and not el.has('userstruncated')]
        if len(times)!=1: raise ValueError('Missing or conflicting shift time')
        match=re.fullmatch(r'(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})',times[0])
        if not match: raise ValueError('Unrecognized shift time')
        start,end=match.groups()
        startAt=datetime.fromisoformat('2026-11-05T'+start+':00+00:00')
        endAt=datetime.fromisoformat('2026-11-05T'+end+':00+00:00')
        if startAt>=endAt or endAt>END: raise ValueError('Unexpected shift boundary')
        # Desktop and phone cells duplicate the same Open value. Read once, verify duplicates.
        values=[el.text().strip() for el in cols[1].children if isinstance(el,Element)]
        if not values: raise ValueError('Missing Open cell')
        if values==['FULL']: opened=0
        elif len(values)==2 and values[0]==values[1] and re.fullmatch(r'\d+',values[0]): opened=int(values[0])
        else: raise ValueError('Unrecognized or conflicting Open values')
        if opened>20: raise ValueError('Unexpected capacity')
        rows.append({'endsAt':endAt.isoformat(), 'open':opened})
    if not rows: raise ValueError('No shifts parsed')
    return rows

def fetch(now=None, previous=None):
    """Read each public sheet once, fail closed, and never start a post-cutoff request."""
    now=now or datetime.now(timezone.utc)
    data={'schema':1,'checkedAt':now.isoformat(),'eventEndsAt':END.isoformat(),'activities':{}}
    if now>=END:
        data['ended']=True
        return data  # Stop provider reads after latest teardown end.
    for code,name in SHEETS.items():
        try:
            if datetime.now(timezone.utc)>=END: break
            request=Request('https://volunteersignup.org/'+code,headers={'User-Agent':'FriendsOfAshley-availability/1.0 (15-minute public counts)'})
            with urlopen(request,timeout=20) as response:
                if response.status!=200: raise ValueError('Source unavailable')
                payload=response.read(2000001)
                if len(payload)>2000000: raise ValueError('Oversized response')
                html=payload.decode('utf-8')
            data['activities'][code]={'name':name,'rows':parse(html),'checkedAt':now.isoformat()}
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
            if set(row)!={'endsAt','open'} or type(row['open']) is not int or not 0<=row['open']<=20: raise ValueError('Invalid count')
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
    candidate = fresh_seed(seed, now)
    try:
        with urlopen(Request(url,headers={'User-Agent':'FriendsOfAshley-count-preservation/1.0'}),timeout=20) as response:
            payload=response.read(100001)
            if len(payload)>100000: raise ValueError('Oversized snapshot')
            published = validate_snapshot(json.loads(payload))
        if candidate is not None:
            # Never replace a newer activity with an older seed. Missing/unavailable
            # published activities are recoverable only from a complete fresh seed.
            newer = False
            for code in SHEETS:
                previous = published['activities'].get(code)
                if previous is None or previous.get('unavailable'):
                    newer = True
                    continue
                seed_time = datetime.fromisoformat(candidate['activities'][code]['checkedAt'])
                published_time = datetime.fromisoformat(previous['checkedAt'])
                if seed_time < published_time:
                    return published
                newer = newer or seed_time > published_time
            if newer:
                return candidate
        return published
    except Exception:
        fallback = candidate or fresh_seed(seed, now, allow_stale=True)
        if fallback is not None:
            return fallback
        print('Published availability unavailable; continuing site deployment without counts',file=sys.stderr)
        return {'schema':1,'checkedAt':None,'eventEndsAt':END.isoformat(),'activities':{}}

if __name__=='__main__':
    output=sys.argv[1] if len(sys.argv)>1 else 'assets/fireworks-availability.json'
    seed = None
    try:
        with open(output) as f: seed = json.load(f)
    except (OSError, ValueError): pass
    previous = preserve('https://www.thefriendsofashley.org/fireworks-availability.json', seed=seed)
    data = previous if '--preserve' in sys.argv else fetch(previous=previous)
    with open(output,'w') as f: json.dump(data,f,separators=(',',':'))
