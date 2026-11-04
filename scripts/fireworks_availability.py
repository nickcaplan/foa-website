"""Counts-only public sheet reader. One request per sheet per hourly workflow.
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
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def has(self, cls): return cls in self.attrs.get('class','').split()
    def all(self):
        """Yield descendants without interpreting external markup as instructions."""
        for child in self.children:
            if isinstance(child, Element):
                yield child
                yield from child.all()
    def text(self): return ''.join(c.text() if isinstance(c, Element) else c for c in self.children)
class Tree(HTMLParser):
    def __init__(self):
        super().__init__(); self.root=Element(); self.current=self.root
    def handle_starttag(self, tag, attrs):
        el=Element(tag, attrs, self.current); self.current.children.append(el)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.current=el
    def handle_endtag(self, tag):
        """Close the nearest matching HTML element, tolerating provider void tags."""
        el=self.current
        while el.parent:
            if el.tag==tag: self.current=el.parent; return
            el=el.parent
    def handle_data(self, text): self.current.children.append(text)
def parse(html):
    """Extract only validated end times and one responsive Open count per row."""
    parser=Tree(); parser.feed(html)
    roots=[el for el in parser.root.all() if el.attrs.get('id')=='rows']
    if len(roots)!=1: raise ValueError('Expected one public sheet rows container')
    rows=[]
    for row in roots[0].all():
        if not row.has('vertical-align') or not row.has('row'): continue
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

def fetch(now=None):
    """Read each public sheet once, fail closed, and never start a post-cutoff request."""
    now=now or datetime.now(timezone.utc)
    data={'schema':1,'checkedAt':now.isoformat(),'eventEndsAt':END.isoformat(),'activities':{}}
    if now>=END:
        data['ended']=True
        return data  # Stop provider reads after latest teardown end.
    for code,name in SHEETS.items():
        try:
            if datetime.now(timezone.utc)>=END: break
            request=Request('https://volunteersignup.org/'+code,headers={'User-Agent':'FriendsOfAshley-availability/1.0 (hourly public counts)'})
            with urlopen(request,timeout=20) as response:
                if response.status!=200: raise ValueError('Source unavailable')
                payload=response.read(2000001)
                if len(payload)>2000000: raise ValueError('Oversized response')
                html=payload.decode('utf-8')
            data['activities'][code]={'name':name,'rows':parse(html),'checkedAt':now.isoformat()}
        except Exception:
            data['activities'][code]={'name':name,'unavailable':True}
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

def preserve(url):
    """Reuse published counts for normal builds. Only a genuine404 bootstraps unavailable."""
    try:
        with urlopen(Request(url,headers={'User-Agent':'FriendsOfAshley-count-preservation/1.0'}),timeout=20) as response:
            payload=response.read(100001)
            if len(payload)>100000: raise ValueError('Oversized snapshot')
            return validate_snapshot(json.loads(payload))
    except HTTPError as error:
        if error.code!=404: raise
        return {'schema':1,'checkedAt':None,'eventEndsAt':END.isoformat(),'activities':{}}

if __name__=='__main__':
    output=sys.argv[1] if len(sys.argv)>1 else 'assets/fireworks-availability.json'
    data=preserve('https://www.thefriendsofashley.org/fireworks-availability.json') if '--preserve' in sys.argv else fetch()
    with open(output,'w') as f: json.dump(data,f,separators=(',',':'))
