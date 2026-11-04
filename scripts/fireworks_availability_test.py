import unittest, importlib.util
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('availability','scripts/fireworks_availability.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def page(opened='3',time='15:30 - 16:30'):
    value='<div>FULL</div>' if opened=='FULL' else f'<div class="visible-xs visible-sm">{opened}</div><div class="visible-md visible-lg">{opened}</div>'
    return f'<div id="rows"><div class="row vertical-align"><div class="col-sm-9"><div class="ellipsis">Setup</div><div class="ellipsis indent">{time}</div><div class="usersall indent">PRIVATE NAME</div></div><div class="vcenter col-sm-2">{value}</div><div>Sign up</div></div></div>'
class ParserTests(unittest.TestCase):
    def test_open_count_once_and_no_personal_data(self):
        rows=m.parse(page());self.assertEqual(rows,[{'endsAt':'2026-11-05T16:30:00+00:00','open':3}]);self.assertNotIn('PRIVATE',str(rows))
    def test_full(self): self.assertEqual(m.parse(page('FULL'))[0]['open'],0)
    def test_zero(self): self.assertEqual(m.parse(page('0'))[0]['open'],0)
    def test_wrong_structure(self):
        for html in ['',page(time='Tomorrow'),page(opened='3').replace('visible-lg">3','visible-lg">4'),page(time='19:00 - 20:00')]:
            with self.assertRaises(ValueError): m.parse(html)
    def test_after_teardown_no_fetch(self):
        data=m.fetch(datetime(2026,11,5,19,0,tzinfo=timezone.utc));self.assertTrue(data['ended']);self.assertEqual(data['activities'],{})


from unittest.mock import patch
from urllib.error import HTTPError, URLError
import io, json
class Response(io.BytesIO):
    status=200
class PreservationTests(unittest.TestCase):
    def test_postevent_preservation_never_fetches(self):
        with patch.object(m,'urlopen',side_effect=URLError('offline')) as request:
            data=m.preserve('https://example.test/counts.json',m.END)
            self.assertTrue(data['ended']);self.assertEqual(data['activities'],{});request.assert_not_called()

    def test_bootstrap_404_only(self):
        with patch.object(m,'urlopen',side_effect=HTTPError('url',404,'missing',{},None)):
            self.assertEqual(m.preserve('https://example.test/counts.json')['activities'],{})
    def test_invalid_or_network_fails_without_overwrite(self):
        for effect in [URLError('offline'),HTTPError('url',500,'error',{},None)]:
            with patch.object(m,'urlopen',side_effect=effect):
                with self.assertRaises(Exception): m.preserve('https://example.test/counts.json')
        for payload in [b'not json',b'{}',b'x'*100001]:
            with patch.object(m,'urlopen',return_value=Response(payload)):
                with self.assertRaises(Exception): m.preserve('https://example.test/counts.json')
    def test_fresh_and_stale_preserved_without_new_timestamps(self):
        for checked in ['2026-11-04T16:40:33+00:00','2026-11-01T16:40:33+00:00']:
            data={'schema':1,'checkedAt':checked,'eventEndsAt':m.END.isoformat(),'activities':{'QCAFK':{'name':'Prize table','checkedAt':checked,'rows':[{'endsAt':m.END.isoformat(),'open':3}]}}}
            for _ in range(2):
                with patch.object(m,'urlopen',return_value=Response(json.dumps(data).encode())): self.assertEqual(m.preserve('https://example.test/counts.json'),data)
    def test_conflicting_time_cells(self):
        with self.assertRaises(ValueError): m.parse(page().replace('</div><div class="vcenter col-sm-2">','<div class="ellipsis indent">17:00 - 18:00</div></div><div class="vcenter col-sm-2">'))
class RequestSafetyTests(unittest.TestCase):
    def test_oversized_response_never_publishes_partial_rows(self):
        with patch.object(m,'urlopen',return_value=Response(page().encode()+b' '*2000001)):
            data=m.fetch(datetime(2026,11,4,17,0,tzinfo=timezone.utc))
            self.assertTrue(all(a.get('unavailable') for a in data['activities'].values()))
    def test_cutoff_checked_between_requests(self):
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
