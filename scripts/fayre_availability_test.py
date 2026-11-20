import unittest, importlib.util, json
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('availability','scripts/fayre_availability.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ANCHOR=next(iter(m.SHEETS)); NAME=m.SHEETS[ANCHOR]
def slot(pill='3 of 6 open',time='Sat, Dec 5 · 2:00 PM – 2:30 PM'):
    """Build a provider-shaped slot containing a private name cell to exclude."""
    return f'<li><button type="button"><div><div class="font-semibold">Helper</div><div class="text-sm text-zinc-600">{time}</div></div><div class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold pill-open">{pill}</div><div class="mt-2 text-xs text-zinc-500">PRIVATE NAME</div></button></li>'
def page(slots=None,anchor=ANCHOR,name=NAME):
    """Build a provider-shaped page with one activity section."""
    return f'<main><section id="{anchor}" class="scroll-mt-4"><h2 class="text-lg font-semibold">{name}</h2><div><p>Description</p></div><ul class="mt-3 space-y-2">{"".join(slots if slots is not None else [slot()])}</ul></section></main>'
class ParserTests(unittest.TestCase):
    def test_open_count_and_no_personal_data(self):
        """Verify open count and no personal data."""
        rows=m.parse(page(),ANCHOR);self.assertEqual(rows,[{'endsAt':'2026-12-05T14:30:00+00:00','open':3,'capacity':6}]);self.assertNotIn('PRIVATE',str(rows))
    def test_full_waitlist_is_zero(self):
        """Verify full waitlist is zero."""
        row=m.parse(page([slot('Full · waitlist')]),ANCHOR)[0];self.assertEqual(row['open'],0);self.assertIsNone(row['capacity'])
    def test_full_slot_capacity_carried_forward(self):
        """Verify a newly full slot keeps its last published capacity."""
        previous={'activities':{ANCHOR:{'name':NAME,'checkedAt':'2026-12-01T08:00:00+00:00','rows':[{'endsAt':'2026-12-05T14:30:00+00:00','open':2,'capacity':6}]}}}
        with patch.object(m,'urlopen',return_value=Response(page([slot('Full · waitlist')]).encode())):
            data=m.fetch(datetime(2026,12,1,9,0,tzinfo=timezone.utc),previous)
        row=data['activities'][ANCHOR]['rows'][0]
        self.assertEqual(row['open'],0);self.assertEqual(row['capacity'],6)
    def test_capacity_fallback_per_row(self):
        end='2026-12-05T14:30:00+00:00'
        def source(cap):
            return {'activities':{ANCHOR:{'rows':[{'endsAt':end,'open':0,'capacity':cap}]}}}
        for seed,previous,live,expected in [(6,None,None,6),(6,4,None,4),(6,4,2,2),(None,None,None,None)]:
            rows=[{'endsAt':end,'open':0,'capacity':live}]
            self.assertEqual(m.carry_capacity(rows,[source(seed),source(previous)],ANCHOR)[0]['capacity'],expected)

    def test_multiple_slots(self):
        """Verify multiple slots."""
        rows=m.parse(page([slot('2 of 3 open','Sat, Dec 5 · 12:00 PM – 12:30 PM'),slot('8 of 8 open','Sat, Dec 5 · 12:30 PM – 1:00 PM')]),ANCHOR)
        self.assertEqual(rows,[{'endsAt':'2026-12-05T12:30:00+00:00','open':2,'capacity':3},{'endsAt':'2026-12-05T13:00:00+00:00','open':8,'capacity':8}])
    def test_noon_and_midnight_boundaries(self):
        """Verify noon and midnight boundaries."""
        self.assertEqual(m.parse(page([slot(time='Sat, Dec 5 · 12:00 AM – 12:30 AM')]),ANCHOR)[0]['endsAt'],'2026-12-05T00:30:00+00:00')
        self.assertEqual(m.parse(page([slot(time='Sat, Dec 5 · 11:30 AM – 12:00 PM')]),ANCHOR)[0]['endsAt'],'2026-12-05T12:00:00+00:00')
    def test_wrong_structure(self):
        """Verify wrong structure."""
        for html in ['',page([slot(pill='3 left')]),page([slot(time='Tomorrow')]),page([slot(pill='7 of 6 open')]),page([slot(time='Sat, Dec 5 · 3:00 PM – 4:00 PM')]),page([slot(time='Sun, Dec 6 · 2:00 PM – 2:30 PM')]),page([slot(pill='21 of 25 open')]),page([],),page(anchor='s-unknown'),page(name='Other')]:
            with self.assertRaises(ValueError,msg=html[:80]): m.parse(html,ANCHOR)
    def test_conflicting_cells_rejected(self):
        """Verify conflicting cells rejected."""
        inner=slot().removeprefix('<li><button type="button">').removesuffix('</button></li>')
        doubled='<li><button type="button">'+inner+inner+'</button></li>'
        with self.assertRaises(ValueError): m.parse(page([doubled]),ANCHOR)
    def test_unknown_sections_ignored(self):
        """Verify unknown sections ignored."""
        html=page()+page(anchor='s-loanlist',name='Props loan')
        self.assertEqual(len(m.parse(html,ANCHOR)),1)
    def test_after_event_no_fetch(self):
        """Verify after event no fetch."""
        data=m.fetch(datetime(2026,12,5,15,30,tzinfo=timezone.utc));self.assertTrue(data['ended']);self.assertEqual(data['activities'],{})
    def test_refresh_window_uk_time(self):
        """Verify refresh window 07:00 to 21:00 UK in GMT and BST."""
        for stamp,expected in [('2026-12-01T06:59:59+00:00',False),('2026-12-01T07:00:00+00:00',True),('2026-12-01T20:59:59+00:00',True),('2026-12-01T21:00:00+00:00',False),('2026-06-01T05:59:59+00:00',False),('2026-06-01T06:00:00+00:00',True),('2026-06-01T19:59:59+00:00',True),('2026-06-01T20:00:00+00:00',False)]:
            self.assertEqual(m.in_window(datetime.fromisoformat(stamp)),expected,stamp)
    def test_overnight_fetch_keeps_previous_without_provider_read(self):
        """Verify overnight fetch keeps previous without provider read."""
        previous={'schema':1,'checkedAt':'2026-11-30T20:47:00+00:00','eventEndsAt':m.END.isoformat(),'activities':{ANCHOR:{'name':NAME,'checkedAt':'2026-11-30T20:47:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':4,'capacity':4}]}}}
        with patch.object(m,'urlopen',side_effect=AssertionError('provider read attempted')):
            self.assertEqual(m.fetch(datetime(2026,12,1,3,0,tzinfo=timezone.utc),previous),previous)
        self.assertEqual(m.fetch(datetime(2026,12,1,3,0,tzinfo=timezone.utc))['activities'],{})

from unittest.mock import patch
from urllib.error import HTTPError
import io
class Response(io.BytesIO):
    status=200
def payload_script(needs=None, section_id=None):
    section={'id':section_id or ANCHOR[2:],'kind':'shift','needs':needs if needs is not None else [{'end':'2026-12-05T14:30:00.000Z','quantity':6,'filled':6,'remaining':0,'full':True}]}
    obj={'slug':m.URL.rstrip('/').split('/')[-1],'sections':[section,{'id':'loans','kind':'item','needs':[{'end':None}]}]}
    text='1:'+json.dumps(obj,separators=(',',':'))
    return '<script>self.__next_f.push('+json.dumps([1,text])+')</script>'

class PayloadTests(unittest.TestCase):
    def test_full_capacity_from_provider_no_personal_fields(self):
        html=page([slot('Full · waitlist')])+payload_script()
        quantities=m.payload_quantities(html)
        self.assertEqual(m.parse(html,ANCHOR,quantities[ANCHOR[2:]])[0]['capacity'],6)
        self.assertEqual(list(quantities),[ANCHOR[2:]])
    def test_payload_crosschecks_open_and_full_pills(self):
        for pill,counts in [('3 of 6 open',(6,3,3,False)),('Full · waitlist',(6,6,0,True))]:
            html=page([slot(pill)])
            good={'2026-12-05T14:30:00+00:00':counts}
            self.assertEqual(m.parse(html,ANCHOR,good)[0]['capacity'],6)
            bad={'2026-12-05T14:30:00+00:00':(5,4,1,False)}
            with self.assertRaises(ValueError): m.parse(html,ANCHOR,bad)
            with self.assertRaises(ValueError): m.parse(html,ANCHOR,{})
    def test_malformed_payload_falls_back_to_pills(self):
        self.assertEqual(m.payload_quantities(page()),{})
        self.assertEqual(m.payload_quantities('<script>self.__next_f.push([invalid])</script>'),{})
        for changes in [{'quantity':True},{'quantity':21},{'remaining':1},{'full':False},{'end':'bad'},{'filled':-1}]:
            need={'end':'2026-12-05T14:30:00.000Z','quantity':6,'filled':6,'remaining':0,'full':True,**changes}
            self.assertEqual(m.payload_quantities(payload_script([need])),{})
    def test_fetch_provider_capacity_wins_over_seed_and_previous(self):
        end='2026-12-05T14:30:00+00:00'
        old={'activities':{ANCHOR:{'rows':[{'endsAt':end,'open':0,'capacity':3}]}}}
        with patch.object(m,'urlopen',return_value=Response((page([slot('Full · waitlist')])+payload_script()).encode())):
            data=m.fetch(datetime(2026,12,1,9,0,tzinfo=timezone.utc),old,old)
        self.assertEqual(data['activities'][ANCHOR]['rows'][0]['capacity'],6)

class FetchTests(unittest.TestCase):
    def test_one_request_covers_every_activity(self):
        """Verify one request covers every activity."""
        html=page().replace('</main>',''.join(page(anchor=a,name=n).replace('<main>','').replace('</main>','') for a,n in list(m.SHEETS.items())[1:])+'</main>')
        with patch.object(m,'urlopen',return_value=Response(html.encode())) as get:
            data=m.fetch(datetime(2026,12,1,9,0,tzinfo=timezone.utc))
        self.assertEqual(get.call_count,1)
        self.assertEqual(len(data['activities']),len(m.SHEETS))
        self.assertTrue(all(not a.get('unavailable') for a in data['activities'].values()))
    def test_failed_fetch_marks_unavailable_and_keeps_previous(self):
        """Verify failed fetch marks unavailable and keeps previous."""
        previous={'activities':{ANCHOR:{'name':NAME,'checkedAt':'2026-12-01T08:00:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':2,'capacity':2}]}}}
        with patch.object(m,'urlopen',side_effect=HTTPError('url',500,'down',{},None)):
            data=m.fetch(datetime(2026,12,1,9,0,tzinfo=timezone.utc),previous)
        self.assertEqual(data['activities'][ANCHOR]['rows'][0]['open'],2)
        others=[a for c,a in data['activities'].items() if c!=ANCHOR]
        self.assertTrue(all(a.get('unavailable') for a in others))
class PreservationTests(unittest.TestCase):
    def test_preserve_failure_never_substitutes_seed(self):
        """A preserve failure must not replace published history with the committed seed.

        Design change, 17 Nov 2026: previously a fresh OR stale seed was returned when
        the published snapshot could not be read, which put a 15 Nov seed live over
        newer counts. Now any preserve failure deploys without counts and warns.
        """
        now=datetime(2026,12,1,9,0,tzinfo=timezone.utc)
        seed={'schema':1,'preview':True,'eventEndsAt':m.END.isoformat(),'activities':{code:{'name':name,'checkedAt':'2026-12-01T08:37:50+00:00','rows':[{'endsAt':m.END.isoformat(),'open':3,'capacity':6}]} for code,name in m.SHEETS.items()}}
        for label,use_seed in [('fresh seed',seed),('no seed',None)]:
            with patch.object(m,'urlopen',side_effect=HTTPError('url',404,'missing',{},None)), patch('sys.stderr',new_callable=io.StringIO) as err:
                result=m.preserve('https://example.test/counts.json',now,use_seed)
            self.assertEqual(result['activities'],{},label)
            self.assertIn('WARNING availability preserve',err.getvalue(),label)
    def test_seed_merges_only_when_newer_per_activity(self):
        """With the published snapshot readable, the seed wins per activity only when newer."""
        now=datetime(2026,12,1,9,0,tzinfo=timezone.utc)
        other=next(c for c in m.SHEETS if c!=ANCHOR)
        published={ANCHOR:{'name':NAME,'checkedAt':'2026-12-01T08:50:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':5,'capacity':6}]},other:{'name':m.SHEETS[other],'checkedAt':'2026-12-01T08:50:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':5,'capacity':6}]}}
        seed={'schema':1,'eventEndsAt':m.END.isoformat(),'activities':{code:{'name':name,'checkedAt':'2026-12-01T08:40:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':1,'capacity':6}]} for code,name in m.SHEETS.items()}}
        seed['activities'][ANCHOR]={'name':NAME,'checkedAt':'2026-12-01T08:59:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':2,'capacity':6}]}
        raw={'schema':1,'eventEndsAt':m.END.isoformat(),'activities':published}
        with patch.object(m,'urlopen',return_value=Response(json.dumps(raw).encode())):
            result=m.preserve('https://example.test/counts.json',now,seed)
        self.assertEqual(result['activities'][ANCHOR]['checkedAt'],'2026-12-01T08:59:00+00:00','newer seed activity wins')
        self.assertEqual(result['activities'][other]['checkedAt'],'2026-12-01T08:50:00+00:00','older seed activity loses to published')
    def test_published_snapshot_salvaged_per_activity(self):
        """Verify published snapshot salvaged per activity."""
        now=datetime(2026,12,1,9,0,tzinfo=timezone.utc)
        good={'name':NAME,'checkedAt':'2026-12-01T08:58:00+00:00','rows':[{'endsAt':m.END.isoformat(),'open':5,'capacity':5}]}
        raw={'schema':1,'eventEndsAt':m.END.isoformat(),'activities':{ANCHOR:good,next(c for c in m.SHEETS if c!=ANCHOR):{'name':'tampered','checkedAt':'bad','rows':[]}}}
        with patch.object(m,'urlopen',return_value=Response(json.dumps(raw).encode())):
            result=m.preserve('https://example.test/counts.json',now)
        self.assertEqual(result['activities'][ANCHOR],good)
        self.assertEqual(len(result['activities']),1)
    def test_validation_rejects_unknown_fields_and_personal_data(self):
        """Verify validation rejects unknown fields and personal data."""
        row={'endsAt':m.END.isoformat(),'open':3,'capacity':6}
        activity={'name':NAME,'checkedAt':'2026-12-01T08:00:00+00:00','rows':[row]}
        base={'schema':1,'checkedAt':'2026-12-01T09:00:00+00:00','eventEndsAt':m.END.isoformat(),'activities':{ANCHOR:activity}}
        self.assertEqual(m.validate_snapshot(dict(base)),dict(base))
        for bad in [dict(base,extra=1),dict(base,eventEndsAt='2026-11-05T19:00:00+00:00'),dict(base,activities={ANCHOR:dict(activity,volunteers=['PRIVATE'])}),dict(base,activities={ANCHOR:dict(activity,rows=[dict(row,names='PRIVATE')])}),dict(base,activities={ANCHOR:dict(activity,rows=[{'endsAt':m.END.isoformat(),'open':21,'capacity':21}])}),dict(base,activities={ANCHOR:dict(activity,rows=[{'endsAt':m.END.isoformat(),'open':3,'capacity':2}])}),dict(base,activities={ANCHOR:dict(activity,rows=[{'endsAt':m.END.isoformat(),'open':3,'capacity':'6'}])}),dict(base,activities={'s-unknown':activity}),dict(base,activities={ANCHOR:dict(activity,name='Other')})]:
            with self.assertRaises(ValueError): m.validate_snapshot(bad)
if __name__=='__main__':
    unittest.main()
