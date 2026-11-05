import unittest, importlib.util
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('availability','scripts/fireworks_availability.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def page(opened='3',time='15:30 - 16:30'):
    """Build a provider-shaped fixture containing private cells to exclude."""
    value='<div>FULL</div>' if opened=='FULL' else f'<div class="visible-xs visible-sm">{opened}</div><div class="visible-md visible-lg">{opened}</div>'
    return f'<div id="rows"><div class="row vertical-align"><div class="col-sm-9"><div class="ellipsis">Setup</div><div class="ellipsis indent">{time}</div><div class="usersall indent">PRIVATE NAME</div></div><div class="vcenter col-sm-2">{value}</div><div>Sign up</div></div></div>'
class ParserTests(unittest.TestCase):
    def test_provider_header_is_not_a_shift(self):
        header='<div class="row persist-header"><div class="col-sm-9 col-xs-8 header">Activity</div><div class="col-sm-2 col-xs-3 header">Open</div><div class="col-sm-1 col-xs-1 header"></div></div>'
        row=page().replace('<div id="rows">','',1)[:-6]
        html='<div id="rows">'+header+'<a href="#">'+row+'</a></div>'
        self.assertEqual(m.parse(html),[{'endsAt':'2026-11-05T16:30:00+00:00','open':3}])
        with self.assertRaises(ValueError): m.parse(html.replace('col-sm-2 col-xs-3 header','col-sm-2 col-xs-3'))
        with self.assertRaises(ValueError): m.parse(html.replace('>Open<','>Filled<'))

    def test_open_count_once_and_no_personal_data(self):
        """Verify open count once and no personal data."""
        rows=m.parse(page());self.assertEqual(rows,[{'endsAt':'2026-11-05T16:30:00+00:00','open':3}]);self.assertNotIn('PRIVATE',str(rows))
    def test_full(self):
        """Verify full."""
        self.assertEqual(m.parse(page('FULL'))[0]['open'],0)
    def test_zero(self):
        """Verify zero."""
        self.assertEqual(m.parse(page('0'))[0]['open'],0)
    def test_wrong_structure(self):
        """Verify wrong structure."""
        for html in ['',page(time='Tomorrow'),page(opened='3').replace('visible-lg">3','visible-lg">4'),page(time='19:00 - 20:00')]:
            with self.assertRaises(ValueError): m.parse(html)
    def test_partial_malformed_sheet_rejected(self):
        valid = page().replace('<div id="rows">','',1)[:-6]
        for classes in ['row','vertical-align','']:
            malformed = valid.replace('row vertical-align',classes)
            with self.assertRaises(ValueError): m.parse('<div id="rows">'+valid+malformed+'</div>')
    def test_anchor_wrapped_shift_is_not_omitted(self):
        row=page().replace('<div id="rows">','',1)[:-6]
        self.assertEqual(len(m.parse('<div id="rows">'+row+'<a href="#">'+row+'</a></div>')),2)
        with self.assertRaises(ValueError): m.parse('<div id="rows">'+row+'<section>'+row+'</section></div>')
    def test_after_teardown_no_fetch(self):
        """Verify after teardown no fetch."""
        data=m.fetch(datetime(2026,11,5,19,0,tzinfo=timezone.utc));self.assertTrue(data['ended']);self.assertEqual(data['activities'],{})


from unittest.mock import patch
from urllib.error import HTTPError, URLError
import io, json
class Response(io.BytesIO):
    status=200
class PreservationTests(unittest.TestCase):
    def test_bootstrap_uses_only_fresh_validated_seed(self):
        now=datetime(2026,11,5,9,0,tzinfo=timezone.utc)
        seed={'schema':1,'preview':True,'eventEndsAt':m.END.isoformat(),'activities':{code:{'name':name,'checkedAt':'2026-11-05T08:37:50+00:00','rows':[{'endsAt':m.END.isoformat(),'open':3}]} for code,name in m.SHEETS.items()}}
        with patch.object(m,'urlopen',side_effect=HTTPError('url',404,'missing',{},None)):
            result=m.preserve('https://example.test/counts.json',now,seed)
            self.assertNotIn('preview',result);self.assertEqual(len(result['activities']),4)
            self.assertEqual(len(m.preserve('https://example.test/counts.json',datetime(2026,11,5,11,0,tzinfo=timezone.utc),seed)['activities']),4)
            seed['activities'].pop('QCAFK')
            self.assertEqual(m.preserve('https://example.test/counts.json',now,seed)['activities'],{})

    def test_newer_fresh_seed_wins_over_old_published(self):
        now=datetime(2026,11,5,10,0,tzinfo=timezone.utc)
        def snapshot(checked):
            return {'schema':1,'checkedAt':checked,'eventEndsAt':m.END.isoformat(),'activities':{code:{'name':name,'checkedAt':checked,'rows':[{'endsAt':m.END.isoformat(),'open':3}]} for code,name in m.SHEETS.items()}}
        old=snapshot('2026-11-05T08:37:50+00:00')
        fresh=snapshot('2026-11-05T09:58:31+00:00')
        with patch.object(m,'urlopen',return_value=Response(json.dumps(old).encode())):
            self.assertEqual(m.preserve('https://example.test/counts.json',now,fresh)['activities'],fresh['activities'])
        with patch.object(m,'urlopen',return_value=Response(json.dumps(fresh).encode())):
            self.assertEqual(m.preserve('https://example.test/counts.json',now,old),fresh)
        future=snapshot('2026-11-05T10:01:00+00:00')
        with patch.object(m,'urlopen',return_value=Response(json.dumps(old).encode())):
            self.assertEqual(m.preserve('https://example.test/counts.json',now,future),old)
        partial=snapshot('2026-11-05T09:58:31+00:00');partial['activities'].pop('QCAFK')
        with patch.object(m,'urlopen',return_value=Response(json.dumps(old).encode())):
            self.assertEqual(m.preserve('https://example.test/counts.json',now,partial),old)
        mixed=snapshot('2026-11-05T08:37:50+00:00');mixed['activities']['QCAFK']['checkedAt']='2026-11-05T09:59:00+00:00'
        with patch.object(m,'urlopen',return_value=Response(json.dumps(mixed).encode())):
            result=m.preserve('https://example.test/counts.json',now,fresh)
            self.assertEqual(result['activities']['QCAFK'],mixed['activities']['QCAFK'])
            self.assertEqual(result['activities']['LPEDP'],fresh['activities']['LPEDP'])

    def test_stale_seed_fills_missing_history_and_survives_failed_fetch(self):
        """Keep each last valid count even when seed is stale and source fails."""
        now=datetime(2026,11,5,11,0,tzinfo=timezone.utc)
        seed={'schema':1,'eventEndsAt':m.END.isoformat(),'activities':{code:{'name':name,'checkedAt':'2026-11-05T08:37:50+00:00','rows':[{'endsAt':m.END.isoformat(),'open':3}]} for code,name in m.SHEETS.items()}}
        published=json.loads(json.dumps(seed));published['activities'].pop('QCAFK');published['activities']['LPEDP']['checkedAt']='2026-11-05T10:58:00+00:00'
        with patch.object(m,'urlopen',return_value=Response(json.dumps(published).encode())):
            previous=m.preserve('https://example.test/counts.json',now,seed)
        self.assertEqual(previous['activities']['QCAFK'],seed['activities']['QCAFK'])
        self.assertEqual(previous['activities']['LPEDP'],published['activities']['LPEDP'])
        class Clock(datetime):
            @classmethod
            def now(cls,tz): return now
        with patch.object(m,'datetime',Clock),patch.object(m,'urlopen',side_effect=URLError('offline')):
            result=m.fetch(now,previous)
        self.assertEqual(result['activities'],previous['activities'])

    def test_postevent_preservation_never_fetches(self):
        """Verify postevent preservation never fetches."""
        with patch.object(m,'urlopen',side_effect=URLError('offline')) as request:
            data=m.preserve('https://example.test/counts.json',m.END)
            self.assertTrue(data['ended']);self.assertEqual(data['activities'],{});request.assert_not_called()

    def test_bootstrap_404_publishes_explicit_unavailable(self):
        """Verify bootstrap 404 publishes explicit unavailable."""
        with patch.object(m,'urlopen',side_effect=HTTPError('url',404,'missing',{},None)):
            self.assertEqual(m.preserve('https://example.test/counts.json',datetime(2026,11,4,17,0,tzinfo=timezone.utc)),{'schema':1,'checkedAt':None,'eventEndsAt':m.END.isoformat(),'activities':{}})
    def test_invalid_or_network_publishes_explicit_unavailable(self):
        """Verify invalid or network publishes explicit unavailable."""
        for effect in [URLError('offline'),HTTPError('url',500,'error',{},None)]:
            with patch.object(m,'urlopen',side_effect=effect):
                self.assertEqual(m.preserve('https://example.test/counts.json',datetime(2026,11,4,17,0,tzinfo=timezone.utc)),{'schema':1,'checkedAt':None,'eventEndsAt':m.END.isoformat(),'activities':{}})
        for payload in [b'not json',b'{}',b'x'*100001,json.dumps({'schema':1,'checkedAt':None,'eventEndsAt':m.END.isoformat(),'activities':{'QCAFK':{'name':'Prize table','rows':[]}}}).encode()]:
            with patch.object(m,'urlopen',return_value=Response(payload)):
                self.assertEqual(m.preserve('https://example.test/counts.json',datetime(2026,11,4,17,0,tzinfo=timezone.utc)),{'schema':1,'checkedAt':None,'eventEndsAt':m.END.isoformat(),'activities':{}})
    def test_fresh_and_stale_preserved_without_new_timestamps(self):
        """Verify fresh and stale preserved without new timestamps."""
        for checked in ['2026-11-04T16:40:33+00:00','2026-11-01T16:40:33+00:00']:
            data={'schema':1,'checkedAt':checked,'eventEndsAt':m.END.isoformat(),'activities':{'QCAFK':{'name':'Prize table','checkedAt':checked,'rows':[{'endsAt':m.END.isoformat(),'open':3}]}}}
            for _ in range(2):
                with patch.object(m,'urlopen',return_value=Response(json.dumps(data).encode())): self.assertEqual(m.preserve('https://example.test/counts.json',datetime(2026,11,4,17,0,tzinfo=timezone.utc)),data)
    def test_conflicting_time_cells(self):
        """Verify conflicting time cells."""
        with self.assertRaises(ValueError): m.parse(page().replace('</div><div class="vcenter col-sm-2">','<div class="ellipsis indent">17:00 - 18:00</div></div><div class="vcenter col-sm-2">'))
class RequestSafetyTests(unittest.TestCase):
    def test_failed_fetch_keeps_prior_valid_count_and_original_time(self):
        checked='2026-11-05T08:37:50+00:00'
        previous={'activities':{code:{'name':name,'checkedAt':checked,'rows':[{'endsAt':m.END.isoformat(),'open':3}]} for code,name in m.SHEETS.items()}}
        class Clock(datetime):
            @classmethod
            def now(cls,tz): return datetime(2026,11,5,10,0,tzinfo=timezone.utc)
        with patch.object(m,'datetime',Clock), patch.object(m,'urlopen',side_effect=URLError('offline')):
            data=m.fetch(datetime(2026,11,5,10,0,tzinfo=timezone.utc),previous)
        self.assertEqual(data['activities'],previous['activities'])

    def test_oversized_response_never_publishes_partial_rows(self):
        """Verify oversized response never publishes partial rows."""
        class Clock(datetime):
            @classmethod
            def now(cls,tz): return datetime(2026,11,4,17,0,tzinfo=timezone.utc)
        with patch.object(m,'datetime',Clock), patch.object(m,'urlopen',side_effect=lambda *a,**kw: Response(page().encode()+b' '*2000001)) as request:
            data=m.fetch(datetime(2026,11,4,17,0,tzinfo=timezone.utc))
            self.assertEqual(request.call_count,len(m.SHEETS))
            self.assertTrue(all(a.get('unavailable') for a in data['activities'].values()))
    def test_valid_size_with_frozen_clock_publishes_every_sheet(self):
        class Clock(datetime):
            @classmethod
            def now(cls,tz): return datetime(2026,11,4,17,0,tzinfo=timezone.utc)
        with patch.object(m,'datetime',Clock), patch.object(m,'urlopen',side_effect=lambda *a,**kw: Response(page().encode())) as request:
            data=m.fetch(Clock.now(timezone.utc))
            self.assertEqual(request.call_count,len(m.SHEETS))
            self.assertTrue(all(a.get('rows',[{}])[0].get('open')==3 for a in data['activities'].values()))
    def test_cutoff_checked_between_requests(self):
        """Verify cutoff checked between requests."""
        class Clock:
            calls=0
            @classmethod
            def now(cls,tz):
                cls.calls+=1
                return datetime(2026,11,5,18,59,tzinfo=timezone.utc) if cls.calls==1 else m.END
        with patch.object(m,'datetime',Clock), patch.object(m,'urlopen',return_value=Response(page().encode())) as request:
            m.fetch(datetime(2026,11,5,18,58,tzinfo=timezone.utc))
            self.assertEqual(request.call_count,1)
if __name__=='__main__': unittest.main()
